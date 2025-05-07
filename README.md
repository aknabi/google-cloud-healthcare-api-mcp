# An MCP Server for FHIR APIs (Google Cloud Healthcare API and HAPI FHIR)

[![smithery badge](https://smithery.ai/badge/@Kartha-AI/google-cloud-healthcare-api-mcp)](https://smithery.ai/server/@Kartha-AI/google-cloud-healthcare-api-mcp)

A Model Context Protocol (MCP) server that provides healthcare tools for interacting with FHIR resources on [Google Cloud Healthcare API](https://cloud.google.com/healthcare-api), [HAPI FHIR Server](https://hapifhir.io/), and public medical research APIs like PubMed, using MCP clients like Claude and Goose.

This is a slightly modified version of the AgentCare MCP Server for EHRs. https://github.com/Kartha-AI/agentcare-mcp

The main difference is that this repo can talk to both Google Cloud Healthcare FHIR APIs (through a SmartOnFHIR gateway secured by Firebase Auth) and HAPI FHIR servers (either public or self-hosted).

## Architecture
<img src="screenshots/architecture.png" alt="Architecture" width="700">

## Demo
- Claude: demo/claude-demo.mp4
- Goose: demo/goose-demo.mp4

## Screenshots
<img src="screenshots/goose/goose-auth.png" alt="Auth" width="700">
<img src="screenshots/goose/goose-patient.png" alt="Patient" width="700">
<img src="screenshots/goose/goose-conditions.png" alt="Conditions" width="700">
<img src="screenshots/goose/goose-vitals.png" alt="Vitals" width="700">

<img src="screenshots/claude/gchapi.png" alt="GCHAPI" width="700">
<img src="screenshots/claude/convo.png" alt="Converse" width="700">
<img src="screenshots/claude/chart.png" alt="Timeline" width="700">
<img src="screenshots/claude/soap.png" alt="Soap Notes" width="700">

## Tools

### FHIR Tools
- `find_patient` - Search for a patient by name, DOB, or other identifiers
- `get_patient_observations` - Retrieve patient observations/vital signs
- `get_patient_conditions` - Get patient's active conditions
- `get_patient_medications` - Get patient's current medications
- `get_patient_encounters` - Get patient's clinical encounters
- `get_patient_allergies` - Get patient's allergies and intolerances
- `get_patient_procedures` - Get patient's procedures
- `get_patient_careteam` - Get patient's care team members
- `get_patient_careplans` - Get patient's active care plans
- `get_vital_signs` - Get patient's vital signs
- `get_lab_results` - Get patient's laboratory results
- `get_medications_history` - Get patient's medication history
- `clinical_query` - Execute custom FHIR queries

### Medical Research Tools
- `search-pubmed` - Search PubMed articles related to medical conditions
- `search-trials` - Find relevant clinical trials
- `drug-interactions` - Check drug-drug interactions

## Usage

Each tool requires specific parameters:

### Required Parameters
- Most tools require `patientId`
- Some tools have additional parameters:
  - `lab_trend_analysis`: requires `labType`
  - `search-pubmed`: requires `query` and optional `maxResults`
  - `search-trials`: requires `condition` and optional `location`
  - `drug-interactions`: requires `drugs` array

Refer to: /src/server/constants/tools.ts for tools specification

## FHIR Server Configuration

This MCP server supports two types of FHIR servers:

### 1. Google Cloud Healthcare API (with Firebase Auth)
- Requires Firebase authentication
- Set `FHIR_USE_AUTH=true` in your environment variables
- Configure all Firebase authentication parameters

### 2. HAPI FHIR Server (Public or Self-Hosted)
#### Public HAPI FHIR Server
- No authentication required
- Set `FHIR_USE_AUTH=false` or omit this environment variable
- Set `FHIR_BASE_URL` to the public HAPI FHIR server URL (defaults to "http://hapi.fhir.org/baseR4")

#### Self-Hosted HAPI FHIR Server with Authentication
For patient or caregiver access to a self-hosted HAPI FHIR server that requires authentication:

1. **Authentication Flow**:
   - The patient/caregiver authenticates through your OAuth 2.0 provider
   - Your application obtains an access token
   - The token is passed to the MCP server through a custom environment variable or API call

2. **Configuration**:
   - Set `FHIR_BASE_URL` to your self-hosted HAPI FHIR server URL
   - Set `FHIR_USE_AUTH=true` if you want to use the built-in Firebase Auth
   - Alternatively, you can pass the token directly to the FhirClient through the API

3. **Token Handling**:
   - The MCP server can receive the token through:
     - Environment variables (for static tokens)
     - API calls (for dynamic tokens that change per user)
     - Custom authentication middleware

## Use with Claude Desktop
```
for claude desktop: 
macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
(use the env variables as shown below)

{
  "mcpServers": {
    "google-cloud-healthcare-api-mcp": {
      "command": "node",
      "args": [
        "/Users/your-username/{google-cloud-healthcare-api-mcp dir}/build/index.js"
      ],
      "env": {
          // For Google Cloud Healthcare API (with Firebase Auth)
          "FIREBASE_API_KEY":"XXXXXXXXX",
          "FIREBASE_AUTH_DOMAIN":"XXXXXXXX",
          "FIREBASE_PROJECT_ID":"XXXXXXX",
          "FIREBASE_STORAGE_BUCKET":"XXXXXXXXX",
          "FIREBASE_MESSAGING_SENDER_ID":"XXXXXXX",
          "FIREBASE_APP_ID":"XXXXXXXXX",
          "FIREBASE_MEASUREMENT_ID":"XXXXXXXX",
          "FIREBASE_AUTH_CALLBACK_PORT":"3456",
          "FHIR_USE_AUTH":"true",
          "FHIR_BASE_URL":"{gchapi-fhir-gateway-host}/fhir",
          
          // For HAPI FHIR Server (uncomment and modify as needed)
          // "FHIR_USE_AUTH":"false",
          // "FHIR_BASE_URL":"http://hapi.fhir.org/baseR4", // Public HAPI FHIR server
          // "FHIR_BASE_URL":"http://localhost:8080/fhir", // Self-hosted HAPI FHIR server
          
          // API keys for medical research tools
          "PUBMED_API_KEY":"your_pubmed_api_key",
          "CLINICAL_TRIALS_API_KEY":"your_trials_api_key",
          "FDA_API_KEY":"your_fda_api_key"
      }
    }
  }
}
```

### Installing via Smithery

To install google-cloud-healthcare-api-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@Kartha-AI/google-cloud-healthcare-api-mcp):

```bash
npx -y @smithery/cli install @Kartha-AI/google-cloud-healthcare-api-mcp --client claude
```

## Start MCP Server Locally with MCP Inspector
```
git clone git@github.com:Kartha-AI/google-cloud-healthcare-api-mcp.git
cd google-cloud-healthcare-api-mcp
npm install
npm run build
npm install -g @modelcontextprotocol/inspector
mcp-inspector build/index.js
http://localhost:5173
Set up the env vars on Inspector
```

## Troubleshooting:
If Claude desktop is running it uses port 3456 for Auth. You need to terminate that process using the following command:
```
kill -9 $(lsof -t -i:3456)
