import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * GET /api/notifications
 * Fetch notifications for a given wallet address
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress query parameter is required' });
    }

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .ilike('recipient_address', String(walletAddress).toLowerCase())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Fallback response if table doesn't exist yet in Supabase schema
      console.warn('[Notifications] Error fetching notifications:', error.message);
      return res.json({ notifications: [], unreadCount: 0 });
    }

    const unreadCount = notifications ? notifications.filter((n: any) => !n.is_read).length : 0;

    return res.json({
      notifications: notifications || [],
      unreadCount
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to mark notification as read', details: error.message });
    }

    return res.json({ message: 'Notification marked as read', notification: data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for a wallet address as read
 */
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required in body' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .ilike('recipient_address', walletAddress.toLowerCase());

    if (error) {
      return res.status(500).json({ error: 'Failed to mark all as read', details: error.message });
    }

    return res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
