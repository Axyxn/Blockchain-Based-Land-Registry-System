import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { readOnlyContract } from '../config/blockchain';
import { ethers } from 'ethers';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

/**
 * POST /api/land/register
 * Accepts deed document file + land metadata.
 * Calculates SHA-256 hash, uploads to Supabase storage 'land-documents', saves off-chain DB record.
 */
router.post('/register', requireAuth, upload.single('deedDocument'), async (req: Request, res: Response) => {
  try {
    const {
      cadastralId,
      title,
      description,
      state,
      district,
      city,
      pincode,
      areaSqft,
      priceEth,
      coordinatesLat,
      coordinatesLng,
      boundaryPolygon,
      ownerAddress
    } = req.body;

    if (!cadastralId || !title || !state || !district || !areaSqft || !ownerAddress) {
      return res.status(400).json({ error: 'Missing required land registration fields' });
    }

    let documentHash = '';
    let documentUrl = '';

    if (req.file) {
      // 1. Calculate SHA-256 Hash of file buffer
      const hashSum = crypto.createHash('sha256');
      hashSum.update(req.file.buffer);
      documentHash = '0x' + hashSum.digest('hex');

      // 2. Upload file to Supabase Storage Bucket 'land-documents'
      const fileName = `${cadastralId}_${Date.now()}_${req.file.originalname}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('land-documents')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (storageError) {
        console.warn('[Storage Error] Falling back to local hash placeholder:', storageError.message);
        documentUrl = `https://storage.placeholder.com/land-documents/${fileName}`;
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('land-documents')
          .getPublicUrl(fileName);
        documentUrl = publicUrlData.publicUrl;
      }
    } else {
      // Fallback hash if file not uploaded directly in form
      const hashSum = crypto.createHash('sha256');
      hashSum.update(Buffer.from(`${cadastralId}-${ownerAddress}-${Date.now()}`));
      documentHash = '0x' + hashSum.digest('hex');
      documentUrl = `https://storage.placeholder.com/land-documents/${cadastralId}.pdf`;
    }

    const priceWei = ethers.parseEther(priceEth || '0').toString();

    // 3. Insert record into Supabase
    const { data: insertedRecord, error: dbError } = await supabase
      .from('land_records')
      .insert({
        cadastral_id: cadastralId,
        title,
        description,
        state,
        district,
        city,
        pincode,
        area_sqft: parseFloat(areaSqft),
        price_eth: parseFloat(priceEth || '0'),
        price_wei: priceWei,
        coordinates_lat: coordinatesLat ? parseFloat(coordinatesLat) : null,
        coordinates_lng: coordinatesLng ? parseFloat(coordinatesLng) : null,
        boundary_polygon: boundaryPolygon ? JSON.parse(boundaryPolygon) : null,
        owner_address: ownerAddress,
        document_url: documentUrl,
        document_hash: documentHash,
        status: 'pending_verification'
      })
      .select()
      .single();

    if (dbError) {
      console.error('[DB Insert Error]', dbError);
      return res.status(500).json({ error: 'Database insert failed', details: dbError.message });
    }

    // 4. Log Activity
    await supabase.from('activity_logs').insert({
      land_record_id: insertedRecord.id,
      event_type: 'REGISTRATION',
      actor_address: ownerAddress,
      details: { cadastralId, title, documentHash }
    });

    return res.status(201).json({
      message: 'Land parcel registered successfully off-chain. Ready for smart contract submission.',
      landRecord: insertedRecord,
      documentHash,
      documentUrl
    });
  } catch (error: any) {
    console.error('[Register API Exception]', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/land/public-ledger
 * Search and filter land records with rich criteria
 */
router.get('/public-ledger', async (req: Request, res: Response) => {
  try {
    const { state, district, status, search, minPrice, maxPrice } = req.query;

    let query = supabase.from('land_records').select('*').order('created_at', { ascending: false });

    if (state) query = query.eq('state', String(state));
    if (district) query = query.eq('district', String(district));
    if (status) query = query.eq('status', String(status));
    if (minPrice) query = query.gte('price_eth', parseFloat(String(minPrice)));
    if (maxPrice) query = query.lte('price_eth', parseFloat(String(maxPrice)));

    if (search) {
      query = query.or(`title.ilike.%${search}%,cadastral_id.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data: records, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to query public ledger', details: error.message });
    }

    return res.json({ count: records.length, records });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * GET /api/land/:id
 * Fetches joined data (Off-chain Supabase record + On-chain state from RPC)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    const isNumeric = !isNaN(Number(id));

    let dbQuery = supabase.from('land_records').select('*');
    if (isUuid) {
      dbQuery = dbQuery.eq('id', id);
    } else if (isNumeric) {
      dbQuery = dbQuery.or(`onchain_id.eq.${parseInt(id)},cadastral_id.eq.${id}`);
    } else {
      dbQuery = dbQuery.eq('cadastral_id', id);
    }

    const { data: records } = await dbQuery;
    const record = records && records.length > 0 ? records[0] : null;

    // Fetch on-chain state if onchain_id exists or if query is numeric
    let onChainData = null;
    const targetOnchainId = record?.onchain_id || (isNumeric ? parseInt(id) : null);

    if (targetOnchainId && readOnlyContract) {
      try {
        const parcel = await readOnlyContract.getLandParcel(targetOnchainId);
        if (parcel && parcel.id && parcel.id.toString() !== '0') {
          onChainData = {
            id: parcel.id.toString(),
            cadastralId: parcel.cadastralId,
            location: parcel.location,
            areaInSqFt: parcel.areaInSqFt.toString(),
            priceWei: parcel.price.toString(),
            priceEth: ethers.formatEther(parcel.price),
            currentOwner: parcel.currentOwner,
            isVerified: parcel.isVerified,
            isForSale: parcel.isForSale,
            documentHash: parcel.documentHash
          };
        }
      } catch (rpcErr) {
        // Parcel on-chain fetch failed or revert
      }
    }

    // Fetch activity logs provenance
    let activityLogs: any[] = [];
    if (record || targetOnchainId) {
      const orConditions = [];
      if (record?.id) orConditions.push(`land_record_id.eq.${record.id}`);
      if (targetOnchainId) orConditions.push(`onchain_parcel_id.eq.${targetOnchainId}`);

      if (orConditions.length > 0) {
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('*')
          .or(orConditions.join(','))
          .order('created_at', { ascending: true });
        if (logs) activityLogs = logs;
      }
    }

    return res.json({
      offChainRecord: record,
      onChainData,
      provenanceTrail: activityLogs
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * POST /api/land/verify
 * Sync registrar approval status manually or trigger backend verification confirmation
 */
router.post('/verify', requireAuth, requireRole(['registrar']), async (req: Request, res: Response) => {
  try {
    const { onchainId, cadastralId, registrarAddress, txHash } = req.body;

    if (!onchainId && !cadastralId) {
      return res.status(400).json({ error: 'onchainId or cadastralId is required' });
    }

    const { data, error } = await supabase
      .from('land_records')
      .update({ status: 'verified', onchain_id: onchainId })
      .or(`onchain_id.eq.${onchainId || 0},cadastral_id.eq.${cadastralId || ''}`)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Verification update failed', details: error.message });
    }

    // Insert activity log
    await supabase.from('activity_logs').insert({
      land_record_id: data.id,
      onchain_parcel_id: onchainId,
      event_type: 'VERIFICATION',
      actor_address: registrarAddress || 'REGISTRAR',
      tx_hash: txHash || null,
      details: { status: 'verified' }
    });

    return res.json({ message: 'Land parcel verified successfully', record: data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * POST /api/webhooks/blockchain-sync
 * Trigger sync of all on-chain parcels into Supabase
 */
router.post('/webhooks/blockchain-sync', requireAuth, requireRole(['registrar']), async (req: Request, res: Response) => {
  try {
    const totalParcelsCount = await readOnlyContract.totalParcelsCount();
    const count = Number(totalParcelsCount);
    const synced = [];

    for (let i = 1; i <= count; i++) {
      const parcel = await readOnlyContract.getLandParcel(i);
      const onchainId = Number(parcel.id);
      const cadastralId = parcel.cadastralId;

      const { data: updated } = await supabase
        .from('land_records')
        .update({
          onchain_id: onchainId,
          owner_address: parcel.currentOwner,
          status: parcel.isForSale ? 'listed_for_sale' : (parcel.isVerified ? 'verified' : 'pending_verification')
        })
        .eq('cadastral_id', cadastralId)
        .select();

      synced.push({ onchainId, cadastralId, updated: !!updated?.length });
    }

    return res.json({ message: `Synced ${synced.length} on-chain parcels`, synced });
  } catch (error: any) {
    return res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

export default router;
