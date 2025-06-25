import axios from 'axios';

/**
 * Fetch all active giveaways
 * @returns {Promise} Promise object that resolves to the giveaways data
 */
export const fetchGiveaways = async () => {
  try {
    const response = await axios.get('/api/giveaways');
    return response.data;
  } catch (error) {
    console.error('Error fetching giveaways:', error);
    throw error;
  }
};

/**
 * Fetch a specific giveaway by ID
 * @param {string} id The giveaway ID
 * @returns {Promise} Promise object that resolves to the giveaway data
 */
export const fetchGiveawayById = async (id) => {
  try {
    const response = await axios.get(`/api/giveaways/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching giveaway ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new giveaway
 * @param {Object} giveawayData The giveaway data
 * @returns {Promise} Promise object that resolves to the created giveaway
 */
export const createGiveaway = async (giveawayData) => {
  try {
    const response = await axios.post('/api/giveaways/create', giveawayData);
    return response.data;
  } catch (error) {
    console.error('Error creating giveaway:', error);
    throw error;
  }
};

/**
 * Join a giveaway
 * @param {string} id The giveaway ID
 * @returns {Promise} Promise object that resolves to the updated giveaway
 */
export const joinGiveaway = async (id) => {
  try {
    const response = await axios.post(`/api/giveaways/${id}/join`);
    return response.data;
  } catch (error) {
    console.error(`Error joining giveaway ${id}:`, error);
    throw error;
  }
};

/**
 * End a giveaway (pick winners)
 * @param {string} id The giveaway ID
 * @returns {Promise} Promise object that resolves to the ended giveaway data
 */
export const endGiveaway = async (id) => {
  try {
    const response = await axios.post(`/api/giveaways/${id}/end`);
    return response.data;
  } catch (error) {
    console.error(`Error ending giveaway ${id}:`, error);
    throw error;
  }
};

/**
 * Fetch giveaways created by the current user
 * @returns {Promise} Promise object that resolves to user's created giveaways
 */
export const fetchUserCreatedGiveaways = async () => {
  try {
    const response = await axios.get('/api/giveaways/user/created');
    return response.data;
  } catch (error) {
    console.error('Error fetching user created giveaways:', error);
    throw error;
  }
};

/**
 * Fetch giveaways joined by the current user
 * @returns {Promise} Promise object that resolves to user's joined giveaways
 */
export const fetchUserJoinedGiveaways = async () => {
  try {
    const response = await axios.get('/api/giveaways/user/joined');
    return response.data;
  } catch (error) {
    console.error('Error fetching user joined giveaways:', error);
    throw error;
  }
}; 