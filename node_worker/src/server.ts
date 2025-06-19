import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import OpenAI from 'openai';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.FIREWORKS_ACCESS_TOKEN,
  baseURL: 'https://api.fireworks.ai/inference/v1',
});

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Development: allow localhost
    if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
      return callback(null, true);
    }

    // Production: allow aibibleplan.org domains
    if (origin.includes('aibibleplan.org')) {
      return callback(null, true);
    }

    // Deny all other origins
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Common function to fetch and validate job data
async function fetchJobData(job_guid: string) {
  const cacheQuery = 'SELECT * FROM prompt_caches WHERE job_id = $1';
  const cacheResult = await pool.query(cacheQuery, [job_guid]);

  if (cacheResult.rows.length === 0) {
    return { error: 'Job not found', status: 404 };
  }

  const jobRecord = cacheResult.rows[0];

  // Check if job is already completed
  if (jobRecord.response) {
    return {
      completed: true,
      response: jobRecord.response,
      jobRecord
    };
  }

  // Parse the LLM request data
  let jobData;
  try {
    jobData = JSON.parse(jobRecord.llm_request);
  } catch (error) {
    return { error: 'Invalid job data', status: 400 };
  }

  return {
    completed: false,
    jobData,
    jobRecord
  };
}

// Function to extract content from response chunks (like Rails' extract_content_from_response)
function extractContentFromResponse(jsonContent: string): string {
  try {
    const parsedData = JSON.parse(jsonContent);
    let contentText = '';

    if (Array.isArray(parsedData)) {
      // Handle array of chunks
      parsedData.forEach((chunk: any) => {
        if (chunk.choices?.[0]?.delta?.content) {
          contentText += chunk.choices[0].delta.content;
        }
      });
    } else {
      // Handle single response object
      if (parsedData.choices?.[0]) {
        if (parsedData.choices[0].message?.content) {
          // Format for complete responses
          contentText = parsedData.choices[0].message.content;
        } else if (parsedData.choices[0].text) {
          // Alternative format
          contentText = parsedData.choices[0].text;
        }
      }
    }

    return contentText;
  } catch (error) {
    console.error('Failed to parse JSON content:', error);
    return '';
  }
}

// Common function to generate LLM content
async function generateLLMContent(
  jobData: any,
  job_guid: string,
  streaming = false,
  onChunk?: (chunk: any) => void
) {
  const responseChunks: any[] = [];

  if (streaming && onChunk) {
    const stream = await openai.chat.completions.create({
      model: jobData.model,
      messages: jobData.messages,
      temperature: jobData.temperature,
      max_tokens: jobData.max_tokens,
      response_format: jobData.response_format,
      stream: true,
    });

    // Stream chunks and call callback for each one
    for await (const chunk of stream) {
      responseChunks.push(chunk);
      // Call the callback with the chunk
      onChunk(chunk);
    }

    // Store as JSON array of chunks (like Rails)
    const fullResponse = JSON.stringify(responseChunks);
    return { fullResponse, responseChunks };
  } else {
    const completion = await openai.chat.completions.create({
      model: jobData.model,
      messages: jobData.messages,
      temperature: jobData.temperature,
      max_tokens: jobData.max_tokens,
      response_format: jobData.response_format,
    });

    // Store as JSON (like Rails) - single completion response
    const fullResponse = JSON.stringify(completion);
    return { fullResponse, completion };
  }
}

// Stream LLM response for plan generation
app.get('/llm_stream/:job_guid', async (req, res) => {
  const { job_guid } = req.params;

  try {
    const jobResult = await fetchJobData(job_guid);

    if (jobResult.error) {
      return res.status(jobResult.status!).json({ error: jobResult.error });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    if (jobResult.completed) {
      // Job already completed, stream the cached chunks to simulate real streaming
      try {
        const cachedResponse = JSON.parse(jobResult.response!);

        if (Array.isArray(cachedResponse)) {
          // Stream each cached chunk with a small delay to simulate real streaming
          for (const chunk of cachedResponse) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            // Small delay between chunks to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
      } catch (parseError) {
        console.error('Failed to parse cached response:', parseError);
        return res.status(500).json({ error: 'Invalid cached response format' });
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }    try {
      const { fullResponse } = await generateLLMContent(
        jobResult.jobData!,
        job_guid,
        true,
        (chunk) => {
          // Send chunk immediately to client
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      );

      res.write(`data: [DONE]\n\n`);

      // Update cache with the full response
      const updateQuery = 'UPDATE prompt_caches SET response = $1, updated_at = NOW() WHERE job_id = $2';
      await pool.query(updateQuery, [fullResponse, job_guid]);

    } catch (error: any) {
      console.error('LLM streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }

  } catch (error) {
    console.error('Job retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    res.end();
  }
});

// Handle TTS generation for daily reading
app.get('/tts_stream/:job_guid', async (req, res) => {
  const { job_guid } = req.params;

  try {
    const jobResult = await fetchJobData(job_guid);

    if (jobResult.error) {
      return res.status(jobResult.status!).json({ error: jobResult.error });
    }

    let content = '';

    if (jobResult.completed) {
      // Use cached response - extract content from JSON
      content = extractContentFromResponse(jobResult.response!);
    } else {
      // Generate new content
      const { fullResponse } = await generateLLMContent(jobResult.jobData!, job_guid, false);

      // Update cache with the JSON response
      const updateQuery = 'UPDATE prompt_caches SET response = $1, updated_at = NOW() WHERE job_id = $2';
      await pool.query(updateQuery, [fullResponse, job_guid]);

      // Extract content for TTS
      content = extractContentFromResponse(fullResponse);
    }

    if (!content) {
      return res.status(500).json({ error: 'No content generated' });
    }

    // Strip markdown and prepare for TTS
    const plainText = content.replace(/[#*`_\[\]]/g, '').replace(/\n+/g, ' ').trim();

    // Generate TTS using Replicate API directly (matching Rails service)
    const ttsResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: 'f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13',
        input: {
          text: plainText,
          speed: 1,
          voice: 'af_bella'
        }
      })
    });

    const ttsResult = await ttsResponse.json();

    console.log('Replicate TTS response:', ttsResult);

    if (ttsResponse.ok && ttsResult.output) {
      res.json({
        success: true,
        content,
        audio_url: ttsResult.output
      });
    } else {
      console.error('TTS generation failed:', ttsResult);
      res.status(500).json({
        error: 'TTS generation failed',
        details: ttsResult
      });
    }

  } catch (error: any) {
    console.error('TTS generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Node.js worker listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});
