/**
 * CareBridge Backend Diagnostic Tool
 * 
 * Run this to diagnose Ollama and backend connectivity issues
 * Usage: node diagnose.js
 */

const axios = require('axios');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const BACKEND_URL = 'http://localhost:3001';

console.log('\n' + '='.repeat(70));
console.log('🔍 CareBridge Backend Diagnostics');
console.log('='.repeat(70) + '\n');

async function checkOllamaService() {
  console.log('1️⃣  Checking Ollama Service...');
  try {
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, {
      timeout: 5000
    });
    console.log('   ✅ Ollama is running at', OLLAMA_HOST);
    return true;
  } catch (error) {
    console.log('   ❌ Ollama is NOT running');
    console.log('   Error:', error.code || error.message);
    console.log('\n   🔧 Fix: Run "ollama serve" in a separate terminal\n');
    return false;
  }
}

async function listModels() {
  console.log('2️⃣  Checking Available Models...');
  try {
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, {
      timeout: 5000
    });
    
    const models = response.data.models || [];
    
    if (models.length === 0) {
      console.log('   ⚠️  No models found');
      console.log('\n   🔧 Fix: Run "ollama pull mistral"\n');
      return false;
    }
    
    console.log(`   ✅ Found ${models.length} model(s):`);
    models.forEach(model => {
      const name = model.name || model.model;
      const size = model.size ? `(${(model.size / 1024 / 1024 / 1024).toFixed(1)} GB)` : '';
      const isMistral = name.toLowerCase().includes('mistral');
      const icon = isMistral ? '✅' : '  ';
      console.log(`      ${icon} ${name} ${size}`);
    });
    
    // Check if Mistral is available
    const hasMistral = models.some(m => 
      (m.name || m.model).toLowerCase().includes('mistral')
    );
    
    if (!hasMistral) {
      console.log('\n   ⚠️  Mistral model not found');
      console.log('   🔧 Fix: Run "ollama pull mistral"\n');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.log('   ❌ Failed to list models');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testMistralGeneration() {
  console.log('3️⃣  Testing Mistral Generation...');
  try {
    const response = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt: 'Say "Hello, CareBridge!" and nothing else.',
        stream: false,
        options: {
          temperature: 0,
          num_predict: 20
        }
      },
      {
        timeout: 30000
      }
    );
    
    const output = response.data.response.trim();
    console.log('   ✅ Mistral is working!');
    console.log('   Response:', output);
    return true;
    
  } catch (error) {
    console.log('   ❌ Mistral generation failed');
    console.log('   Error:', error.response?.data?.error || error.message);
    
    if (error.message.includes('model') || error.response?.data?.error?.includes('model')) {
      console.log('\n   🔧 Fix: Model may have changed name after update');
      console.log('   Try: ollama list (to see actual model names)');
      console.log('   Then update OLLAMA_MODEL in your .env file\n');
    }
    
    return false;
  }
}

async function checkBackendHealth() {
  console.log('4️⃣  Checking Backend Server...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, {
      timeout: 5000
    });
    
    console.log('   ✅ Backend server is running');
    console.log('   Status:', response.data.status);
    console.log('   Ollama Available:', response.data.ollama?.available ? '✅' : '❌');
    console.log('   Model:', response.data.ollama?.model);
    console.log('   Active Requests:', response.data.server?.activeRequests);
    
    return response.data.ollama?.available;
    
  } catch (error) {
    console.log('   ❌ Backend server is NOT responding');
    console.log('   Error:', error.code || error.message);
    console.log('\n   🔧 Fix: Start backend with "cd backend && node server.js"\n');
    return false;
  }
}

async function testSummarization() {
  console.log('5️⃣  Testing Summarization Endpoint...');
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/summarize`,
      {
        text: 'Patient admitted with chest pain. Diagnosed with acute myocardial infarction. Underwent PCI with stent placement. Discharged on aspirin and clopidogrel.',
        options: {}
      },
      {
        timeout: 35000
      }
    );
    
    console.log('   ✅ Summarization working!');
    console.log('   Summary:', response.data.summary.substring(0, 100) + '...');
    console.log('   Confidence:', response.data.confidence);
    return true;
    
  } catch (error) {
    console.log('   ❌ Summarization failed');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runDiagnostics() {
  const results = {
    ollama: false,
    models: false,
    mistral: false,
    backend: false,
    summarization: false
  };
  
  results.ollama = await checkOllamaService();
  console.log('');
  
  if (results.ollama) {
    results.models = await listModels();
    console.log('');
    
    if (results.models) {
      results.mistral = await testMistralGeneration();
      console.log('');
    }
  }
  
  results.backend = await checkBackendHealth();
  console.log('');
  
  if (results.backend) {
    results.summarization = await testSummarization();
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(70));
  console.log('📊 Diagnostic Summary');
  console.log('='.repeat(70));
  console.log('Ollama Service:        ', results.ollama ? '✅ Running' : '❌ Not Running');
  console.log('Mistral Model:         ', results.models ? '✅ Installed' : '❌ Not Found');
  console.log('Mistral Generation:    ', results.mistral ? '✅ Working' : '❌ Failed');
  console.log('Backend Server:        ', results.backend ? '✅ Running' : '❌ Not Running');
  console.log('Summarization Endpoint:', results.summarization ? '✅ Working' : '❌ Failed');
  console.log('='.repeat(70));
  
  if (results.ollama && results.models && results.mistral && results.backend && results.summarization) {
    console.log('\n🎉 All systems operational! Your CareBridge backend is ready.\n');
  } else {
    console.log('\n⚠️  Issues detected. Follow the fixes above to resolve.\n');
    
    // Quick fix guide
    console.log('🔧 Quick Fix Guide:');
    if (!results.ollama) {
      console.log('   1. Run: ollama serve');
    }
    if (!results.models) {
      console.log('   2. Run: ollama pull mistral');
    }
    if (!results.backend) {
      console.log('   3. Run: cd backend && node server.js');
    }
    console.log('');
  }
}

runDiagnostics().catch(error => {
  console.error('\n❌ Diagnostic script failed:', error.message);
  console.log('');
});
