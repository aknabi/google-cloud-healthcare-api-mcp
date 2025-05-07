/**
 * Example of using the MCP server with a self-hosted HAPI FHIR server
 * for patient/caregiver access with authentication
 */

import { spawn } from 'child_process';
import axios from 'axios';

// This would be your OAuth 2.0 authentication function
// In a real application, this would redirect the user to the auth provider
// and handle the callback to get the token
async function authenticatePatient() {
  console.log('Authenticating patient with OAuth 2.0 provider...');
  
  // In a real application, this would be the result of the OAuth flow
  // For this example, we're simulating a successful authentication
  return {
    accessToken: 'example_patient_access_token',
    tokenType: 'Bearer',
    patientId: 'patient123'
  };
}

// Start the MCP server
async function startMcpServer() {
  console.log('Starting MCP server...');
  
  // Set environment variables for the MCP server
  const env = {
    ...process.env,
    FHIR_BASE_URL: 'http://localhost:8080/fhir', // Your self-hosted HAPI FHIR server
    FHIR_USE_AUTH: 'false', // We'll handle auth manually in this example
    PUBMED_API_KEY: 'dummy_key',
    CLINICAL_TRIALS_API_KEY: 'dummy_key',
    FDA_API_KEY: 'dummy_key'
  };
  
  // Start the MCP server
  const mcpServer = spawn('node', ['../build/index.js'], { 
    env,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'] 
  });
  
  // Handle server output
  mcpServer.stdout.on('data', (data) => {
    console.log(`MCP Server stdout: ${data}`);
  });
  
  mcpServer.stderr.on('data', (data) => {
    console.log(`MCP Server stderr: ${data}`);
  });
  
  return mcpServer;
}

// Example of how a patient application would use the MCP server
async function patientApp() {
  try {
    // 1. Start the MCP server
    const mcpServer = await startMcpServer();
    
    // 2. Authenticate the patient
    const authResult = await authenticatePatient();
    console.log(`Patient authenticated with token: ${authResult.accessToken}`);
    
    // 3. In a real application, you would now use the MCP client SDK to connect to the server
    console.log('Connecting to MCP server...');
    
    // 4. Set the access token for the patient
    console.log('Setting patient access token...');
    // In a real application, you would use the MCP client SDK to call a method like:
    // mcpClient.callTool('set_access_token', {
    //   token: authResult.accessToken,
    //   tokenType: authResult.tokenType
    // });
    
    // 5. Now you can make authenticated requests for the patient's data
    console.log('Fetching patient data...');
    // In a real application, you would use the MCP client SDK to call tools like:
    // const conditions = await mcpClient.callTool('get_patient_conditions', {
    //   patientId: authResult.patientId
    // });
    
    // 6. Display the data to the patient
    console.log('Displaying patient data...');
    
    // Cleanup
    setTimeout(() => {
      console.log('Shutting down...');
      mcpServer.kill();
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('Error in patient application:', error);
  }
}

// Run the example
patientApp();

/**
 * Implementation Notes:
 * 
 * 1. Authentication Flow:
 *    - The patient authenticates through your OAuth provider
 *    - Your application receives an access token
 *    - The token is passed to the MCP server
 * 
 * 2. Token Handling Options:
 *    a. Direct API Call:
 *       - Add a custom tool to the MCP server like 'set_access_token'
 *       - Call this tool before making any data requests
 *       - The FhirClient will use this token for all subsequent requests
 * 
 *    b. Environment Variable:
 *       - Set FHIR_ACCESS_TOKEN in the environment
 *       - The MCP server reads this at startup
 *       - Good for static tokens, not ideal for multi-user scenarios
 * 
 *    c. Custom Authentication Middleware:
 *       - Implement a middleware in the MCP server
 *       - The middleware handles token validation and user context
 *       - Best for complex multi-user scenarios
 * 
 * 3. Security Considerations:
 *    - Ensure tokens are transmitted securely
 *    - Consider token expiration and refresh flows
 *    - Implement proper error handling for auth failures
 *    - Use HTTPS for all communications
 */
