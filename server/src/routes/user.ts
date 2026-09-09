import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * GET /api/user/profile/:walletAddress
 */
router.get('/profile/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    if (!profile) {
      return res.json({ profile: null, message: 'Profile not found' });
    }

    return res.json({ profile });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * POST /api/user/profile
 * Upsert user profile
 */
router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { walletAddress, role, fullName, email, phone } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          wallet_address: walletAddress.toLowerCase(),
          role: role || 'buyer',
          full_name: fullName,
          email,
          phone,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'wallet_address' }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Profile save failed', details: error.message });
    }

    return res.json({ message: 'Profile saved successfully', profile: data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
