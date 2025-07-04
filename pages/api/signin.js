import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import dbConnect from '@/lib/dbConnect';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  try {
    await dbConnect();
    
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ valid: 1, error: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ valid: 2, error: 'User not found. Please sign up first.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ valid: 1, error: 'Invalid email or password' });
    }
    
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? '7d' : '24h' }
    );
    
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'strict',
        maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60,
        path: '/',
      })
    );
    
    return res.status(200).json({
      valid: 0,
      username: user.Username,
      message: 'Sign-in successful',
    });
  } catch (error) {
    console.error('Signin error:', error);
    return res.status(500).json({ valid: 1, error: 'Sign-in failed. Please try again.' });
  }
}
