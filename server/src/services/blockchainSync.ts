import { readOnlyContract } from '../config/blockchain';
import { supabase } from '../config/supabase';
import { ethers } from 'ethers';

async function sendNotification(recipientAddress: string, title: string, message: string, parcelId?: number) {
  try {
    await supabase.from('notifications').insert({
      recipient_address: recipientAddress.toLowerCase(),
      title,
      message,
      onchain_parcel_id: parcelId || null,
      is_read: false
    });
  } catch (err) {
    console.warn('[Notification] Could not insert notification:', err);
  }
}

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

      await sendNotification(
        owner,
        'Land Parcel Registered',
        `Your parcel ${cadastralId} (On-chain #${parcelId}) has been successfully registered on-chain.`,
        Number(parcelId)
      );
    } catch (err) {
      console.error('[BlockchainSync] Exception in LandRegistered listener:', err);
    }
  });

  // Event: LandVerified
  readOnlyContract.on('LandVerified', async (parcelId, registrar, event) => {
    console.log(`[Event: LandVerified] Parcel #${parcelId} verified by registrar ${registrar}`);
    try {
      const { data: record } = await supabase
        .from('land_records')
        .update({ status: 'verified' })
        .eq('onchain_id', Number(parcelId))
        .select()
        .maybeSingle();

      await supabase.from('activity_logs').insert({
        onchain_parcel_id: Number(parcelId),
        event_type: 'VERIFICATION',
        actor_address: registrar,
        tx_hash: event?.log?.transactionHash || null,
        details: { status: 'verified' }
      });

      if (record?.owner_address) {
        await sendNotification(
          record.owner_address,
          'Title Verified!',
          `Parcel #${parcelId} title has been verified by Registrar ${registrar}.`,
          Number(parcelId)
        );
      }
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

      await sendNotification(
        newOwner,
        'Property Acquired',
        `Congratulations! Title for Parcel #${parcelId} has been successfully transferred to your wallet.`,
        Number(parcelId)
      );

      await sendNotification(
        previousOwner,
        'Property Sold',
        `Parcel #${parcelId} title transfer completed and funds released to your wallet.`,
        Number(parcelId)
      );
    } catch (err) {
      console.error('[BlockchainSync] Exception in LandTransferred listener:', err);
    }
  });

  // Event: DisputeFlagged
  readOnlyContract.on('DisputeFlagged', async (parcelId, reporter, reason, event) => {
    console.log(`[Event: DisputeFlagged] Parcel #${parcelId} flagged as disputed by ${reporter}`);
    try {
      const { data: record } = await supabase
        .from('land_records')
        .update({ status: 'disputed' })
        .eq('onchain_id', Number(parcelId))
        .select()
        .maybeSingle();

      await supabase.from('activity_logs').insert({
        onchain_parcel_id: Number(parcelId),
        event_type: 'DISPUTE_FLAGGED',
        actor_address: reporter,
        tx_hash: event?.log?.transactionHash || null,
        details: { reason }
      });

      if (record?.owner_address) {
        await sendNotification(
          record.owner_address,
          'Property Flagged as Disputed',
          `Parcel #${parcelId} has been marked as disputed. Transfers are currently frozen.`,
          Number(parcelId)
        );
      }
    } catch (err) {
      console.error('[BlockchainSync] Exception in DisputeFlagged listener:', err);
    }
  });

  // Event: DisputeResolved
  readOnlyContract.on('DisputeResolved', async (parcelId, registrar, event) => {
    console.log(`[Event: DisputeResolved] Parcel #${parcelId} dispute resolved by ${registrar}`);
    try {
      const { data: record } = await supabase
        .from('land_records')
        .update({ status: 'verified' })
        .eq('onchain_id', Number(parcelId))
        .select()
        .maybeSingle();

      await supabase.from('activity_logs').insert({
        onchain_parcel_id: Number(parcelId),
        event_type: 'DISPUTE_RESOLVED',
        actor_address: registrar,
        tx_hash: event?.log?.transactionHash || null,
        details: { status: 'resolved' }
      });

      if (record?.owner_address) {
        await sendNotification(
          record.owner_address,
          'Dispute Resolved',
          `The dispute on Parcel #${parcelId} has been cleared by the Registrar.`,
          Number(parcelId)
        );
      }
    } catch (err) {
      console.error('[BlockchainSync] Exception in DisputeResolved listener:', err);
    }
  });
}
