const { pipeline } = require('@xenova/transformers');
const { fetch } = require('undici'); // Node 18+ has fetch, but undici is safer in some electron envs

let extractor = null;

async function getExtractor() {
  if (extractor) return extractor;
  // Use a small, fast model for embeddings
  extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  });
  return extractor;
}

async function generateEmbedding(text) {
  const model = await getExtractor();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function queryOllama(prompt, context = '') {
  const url = 'http://localhost:11434/api/generate';
  const systemPrompt = `You are EchoSphere, a privacy-first AI digital memory assistant.
Use the following retrieved memories to answer the user's question accurately.
If the information is not in the context, say you don't know based on memories.
Context: ${context}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        model: 'mistral', // Defaulting to mistral as per PRD
        prompt: prompt,
        system: systemPrompt,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error('Ollama not responding');
    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error('Ollama Error:', err);
    return "Error: Could not connect to local Ollama. Please ensure it is running and 'mistral' is installed.";
  }
}

module.exports = {
  generateEmbedding,
  queryOllama,
};
