export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const KEY = process.env.OPENROUTER_API_KEY;
  if (!KEY) return res.status(200).json({ error: 'NO KEY' });

  const MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-flash-1.5-8b:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'qwen/qwen-2.5-7b-instruct:free',
    'deepseek/deepseek-r1-distill-llama-70b:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'minimax/minimax-m2.7:free',
  ];

  const results = {};

  for (const model of MODELS) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KEY}`,
          'HTTP-Referer': 'https://nexusagri.vercel.app',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Balas dengan kata OK saja.' }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const text = await r.text();
      if (r.ok) {
        const d = JSON.parse(text);
        results[model] = '✅ OK: ' + (d.choices?.[0]?.message?.content || 'empty');
      } else {
        results[model] = `❌ ${r.status}: ${text.slice(0,80)}`;
      }
    } catch(e) {
      results[model] = '❌ ERROR: ' + e.message;
    }
  }

  return res.status(200).json({ key: KEY.slice(0,12)+'...', results });
}
