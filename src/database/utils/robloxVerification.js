import axios from 'axios';
import User from '../models/User';

export const generateVerificationPhrase = async () => {
  try {
    const response = await axios.get('https://random-word-api.herokuapp.com/word?number=15');
    const words = response.data;
    return `VERFICIATION: ${words.join(' ')}`;
  } catch (error) {
    console.error('Error generating phrase:', error);
    return null;
  }
};

export const generateUniqueCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

export const getRobloxUserId = async (username) => {
  try {
    const response = await axios.get(`https://api.roblox.com/users/get-by-username?username=${username}`);
    return response.data.Id;
  } catch (error) {
    console.error('Error getting Roblox ID:', error);
    return false;
  }
};

export const checkVerification = async (userId) => {
  try {
    const user = await User.findOne({ robloxId: userId });
    if (!user) return false;

    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    const description = response.data.description;
    
    return description.includes(user.verificationPhrase);
  } catch (error) {
    console.error('Error checking verification:', error);
    return false;
  }
};

export const registerUser = async (username) => {
  try {
    const robloxId = await getRobloxUserId(username);
    if (!robloxId) return false;

    const verificationPhrase = await generateVerificationPhrase();
    if (!verificationPhrase) return false;

    const code = generateUniqueCode();

    const newUser = new User({
      username,
      robloxId,
      verificationPhrase,
      displayName: username,
      code
    });

    await newUser.save();
    return {
      code,
      robloxId,
      verificationPhrase
    };
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
}; 