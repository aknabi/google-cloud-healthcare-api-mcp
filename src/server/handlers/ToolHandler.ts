import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { FhirClient } from "../connectors/fhir/FhirClient.js"
import { TOOL_DEFINITIONS } from "../constants/tools.js"
import { parseClinicianQuery } from "../../query-parser.js";
import { PubMed } from "../connectors/medical/PubMed.js"
import { ClinicalTrials } from "../connectors/medical/ClinicalTrials.js"
import { FDA } from "../connectors/medical/FDA.js"
import { CacheManager } from "../utils/Cache.js"
import { Auth } from "../utils/FirebaseAuth.js"
import { FirebaseAuthConfig} from "../utils/FirebaseAuthConfig.js"

export class ToolHandler {
  private fhirClient: FhirClient;
  private cache: CacheManager;    
  private pubmedApi: PubMed;
  private trialsApi: ClinicalTrials;
  private fdaApi: FDA;
  private auth!: Auth;
  private authInitialized: boolean = false;
  private authConfig: FirebaseAuthConfig;
  
  constructor(authConfig:FirebaseAuthConfig, fhirClient: FhirClient, cache: CacheManager, pubmedApi: PubMed, trialsApi: ClinicalTrials, fdaApi: FDA) {
    this.authConfig = authConfig;
    this.cache = cache;
    this.fhirClient = fhirClient;
    this.pubmedApi = pubmedApi;
    this.trialsApi = trialsApi;
    this.fdaApi = fdaApi;
  }

  register(mcpServer: Server) {
    mcpServer.setRequestHandler(ListToolsRequestSchema, this.handleList);
    mcpServer.setRequestHandler(CallToolRequestSchema, this.handleCall);
  }

  private handleList = async () => ({
    tools: TOOL_DEFINITIONS
  });

  private handleCall = async (request: any) => {
    if(request.params?.name != "find_patient" && request.params?.name != "get-drug"
      && request.params?.name != "search-trials" && request.params?.name != "search-pubmed"
      && request.params?.name != "set_access_token") 
     { 
      if (!request.params?.arguments?.patientId) {
        throw new McpError(ErrorCode.InvalidParams, "patientId is required");
      }
    }

    // Check if we need to use authentication (for Google Cloud Healthcare API)
    // or if we can skip it (for HAPI FHIR server without auth)
    const useAuth = process.env.FHIR_USE_AUTH === 'true';
    
    if (useAuth) {
      //initialize auth if not already initialized. this will set up the callback server 
      if(!this.authInitialized) {
        this.auth = new Auth(this.authConfig);
        this.authInitialized = true;
      }
   
      return this.auth.executeWithAuth(async () => {  
        const access_token = await this.auth.getAccessToken();
        this.fhirClient.setAccessToken(access_token);
        
        return await this.executeToolRequest(request.params);
      });
    } else {
      // Skip authentication for HAPI FHIR server
      return await this.executeToolRequest(request.params);
    }
  }
  
  private async executeToolRequest(params: any) {
    switch (params.name) {
      case "set_access_token":
        return await this.handleSetAccessToken(params.arguments);
      case "clinical_query":
        return await this.handleClinicalQuery(params.arguments);
      case "find_patient":
        return await this.fhirClient.findPatient(params.arguments);
      case "get_patient_observations":
        return await this.fhirClient.getPatientObservations(params.arguments);
      case "get_patient_conditions":
        return await this.fhirClient.getPatientConditions(params.arguments);
      case "get_patient_medications":
        return await this.fhirClient.getPatientMedications(params.arguments);
      case "get_patient_encounters":
        return await this.fhirClient.getPatientEncounters(params.arguments);
      case "get_patient_allergies":
        return await this.fhirClient.getPatientAllergies(params.arguments);
      case "get_patient_procedures":
        return await this.fhirClient.getPatientProcedures(params.arguments);
      case "get_patient_careteam":
        return await this.fhirClient.getPatientCareTeam(params.arguments);
      case "get_patient_careplans":
        return await this.fhirClient.getPatientCarePlans(params.arguments);
      case "get_vital_signs":
        return await this.fhirClient.getPatientVitalSigns(params.arguments);
      case "get_lab_results":
        return await this.fhirClient.getPatientLabResults(params.arguments);
      case "get_medications_history":
        return await this.fhirClient.getMedicationHistory(params.arguments);
      case "get_appointments":
        return await this.fhirClient.getPatientAppointments(params.arguments);
      case "search-pubmed":
        return await this.pubmedApi.getArticles(params.arguments,this.cache);
      case "search-trials":
        return await this.trialsApi.getTrials(params.arguments,this.cache);
      case "get-drug-info":
        return await this.fdaApi.getDrug(params.arguments,this.cache);
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${params.name}`);
    }
  }
  
  private async handleSetAccessToken(args: any) {
    if (!args.token) {
      throw new McpError(ErrorCode.InvalidParams, "Token is required");
    }

    try {
      // Set the access token in the FHIR client
      this.fhirClient.setAccessToken(args.token, args.tokenType || 'Bearer');
      
      return {
        content: [{
          type: "text",
          text: "Access token set successfully"
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error setting access token: ${error.message || 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleClinicalQuery(args: any) {
    if (!args.query) {
      throw new McpError(ErrorCode.InvalidParams, "Query is required");
    }

    try {
      const queryParams = await parseClinicianQuery(args.query);
      return await this.fhirClient.executeQuery(queryParams);
    } catch (error: any) {
      return this.fhirClient.handleError(error);
    }
  }
}
