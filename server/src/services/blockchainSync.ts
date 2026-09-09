import { readOnlyContract } from '../config/blockchain';
import { supabase } from '../config/supabase';
import { ethers } from 'ethers';

export function startBlockchainSyncListener() {
  console.log('[BlockchainSync] Starting event listener for LandRegistry contract...');

  // Event: LandRegistered
  readOnlyContract.on('LandRegistered', async (parcelId, owner, cadastralId, location, areaInSqFt, price, documentHash, event) => {
    console.log(`[Event: LandRegistered] Parcel #${parcelId} registered by ${owner}`);
    try {
      const docHashHex = typeof documentHash === 'string' ? documentHash : ethers.hexlify(documentHash);
      
      // Sync on-chain ID to matching cadastral record in Supabase
      const { data, error } = await supabase
        .from('land_records')
        .update({
          onchain_id: Number(parcelId),
          owner_address: owner,
          status: 'pending_verification'
        })
        .eq('cadastral_id', cadastralId);

      if (error) {
        console.error('[BlockchainSync] Error updating land record on LandRegistered:', error);
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        onchain_parcel_id: Number(parcelId),
        event_type: 'REGISTRATION',
        actor_address: owner,
        tx_hash: event?.log?.transactionHash || null,
        details: { cadastralId, location, areaInSqFt: Number(areaInSqFt), priceWei: price.toString(), docHashHex }
      });
    } catch (err) {
      console.error('[BlockchainSync] Exception in LandRegistered listener:', err);
    }
  });

  // Event: LandVerified
  readOnlyContract.on('LandVerified', async (parcelId, registrar, event) => {
    console.log(`[Event: LandVerified] Parcel #${parcelId} verified by registrar ${registrar}`);
    try {
      await supabase
        .from('land_records')
        .update({ status: 'verified' })
        .eq('onchain_id', Number(parcelId));

      await supabase.from('activity_logs').insert({
        onchain_parcel_id: Number(parcelId),
        event_type: 'VERIFICATION',
        actor_address: registrar,
        tx_hash: event?.log?.transactionHash || null,
        details: { status: 'verified' }
      });
    } catch (err) {
      console.error('[BlockchainSync] Exception in LandVerified listener:', err);
    }
  });

  // Event: LandTransferred
  readOnlyContract.on('LandTransferred', async (parcelId, previousOwner, newOwner, price, event) => {
    console.log(`[Event: LandTransferred] Parcel #${parcelId} transferred from ${previousOwner} to ${newOwner}`);
    try {
      await supabase
        .from('land_records')
        .update({
          owner_address: newOwner,
          status: 'transferred'
        })
        .eq('onchain_id', Number(parcelId));

      await supabase
        .from('transfer_requests')
        .update({ status: 'completed', tx_hash: event?.log?.transactionHash || null })
        .eq('onchain_parcel_id', Number(parcelId))
        .eq('buyer_address', newOwner);

      await supabase.from('activity_logs').insert({
        onchain_parcel_id: Number(parcelId),
        event_type: 'TRANSFER_COMPLETED',
        actor_address: newOwner,
        previous_owner: previousOwner,
        new_owner: newOwner,
        tx_hash: event?.log?.transactionHash || null,
        details: { priceWei: price.toString() }
      });
    } catch (err) {
      console.error('[BlockchainSync] Exception in LandTransferred listener:', err);
    }
  });
}
