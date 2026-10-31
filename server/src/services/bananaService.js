/**
 * Purpose: Service to interact with the external Banana API
 * AI-assisted (Antigravity) — reviewed by student
 * Source: Marc Conrad's Banana Puzzle API (https://marcconrad.com/uob/banana/doc.php)
 */

const BANANA_API_URL = 'https://marcconrad.com/uob/banana/api.php?out=json';

/**
 * Fetches a visual mathematical puzzle from the external Banana API.
 * The external response schema provides:
 *   { question: string (image URL), solution: number (integer) }
 *
 * @returns {Promise<{ question: string, solution: number }>}
 */
async function fetchPuzzle() {
  try {
    const response = await fetch(BANANA_API_URL);

    if (!response.ok) {
      throw new Error(`Banana API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || typeof data.question !== 'string' || data.solution === undefined) {
      throw new Error('Invalid puzzle format received from Banana API');
    }

    return {
      question: data.question,
      solution: parseInt(data.solution, 10),
    };
  } catch (error) {
    console.error('Failed to fetch puzzle from Banana API:', error.message);
    throw new Error('Unable to generate puzzle. Please try again later.');
  }
}

module.exports = {
  fetchPuzzle,
};
