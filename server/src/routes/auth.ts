import { Router, Request, Response } from 'express';
import { generateNonce, SiweMessage } from 'siwe';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const JWT_EXPIRES_IN = '24h';

router.get('/nonce', (req: Request, res: Response) => {
  const nonce = generateNonce();
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(nonce);
});

router.post('/demo-login', async (req: Request, res: Response) => {
  try {
    const { role, walletAddress } = req.body;
    
    // Insert or update profile
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{ wallet_address: walletAddress.toLowerCase(), role }])
        .select()
        .single();
      if (insertError) throw insertError;
      profile = newProfile;
    }

    const token = jwt.sign(
      { walletAddress: profile.wallet_address, role: profile.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({ token, profile });
  } catch (error: any) {
    return res.status(500).json({ error: 'Demo login failed', details: error.message });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { message, signature } = req.body;

    if (!message || !signature) {
      return res.status(422).json({ error: 'Expected message and signature.' });
    }

    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    const walletAddress = fields.address.toLowerCase();

    // Check if user exists in profiles, if not create a default one
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    if (!profile) {
      // Create new default buyer profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{ wallet_address: walletAddress, role: 'buyer' }])
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: 'Failed to create profile', details: insertError.message });
      }
      profile = newProfile;
    }

    // Generate JWT
    const token = jwt.sign(
      { walletAddress: profile.wallet_address, role: profile.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Authentication successful',
      token,
      profile
    });
  } catch (error: any) {
    console.error('SIWE Verification Error:', error);
    return res.status(401).json({ error: 'Invalid signature or message.', details: error.message });
  }
});

export default router;
