import axios from "axios";
import { calculateTimeframeDate } from "./Helper.js";
export class FhirClient {
    client;
    accessToken = null;
    useAuth = false;
    constructor(baseUrl, useAuth = false) {
        this.useAuth = useAuth;
        // Initialize axios client with base configuration
        this.client = axios.create({
            baseURL: baseUrl,
            headers: {
                Accept: "application/fhir+json",
            },
        });
    }
    setAccessToken(token) {
        this.accessToken = token;
        if (this.useAuth && this.accessToken) {
            this.client.defaults.headers.Authorization = `Bearer ${this.accessToken}`;
        }
    }
    async search(resourceType, params = {}) {
        try {
            const searchParams = new URLSearchParams(params);
            const response = await this.client.get(`/${resourceType}?${searchParams}`);
            return response.data;
        }
        catch (error) {
            console.error(`Error searching ${resourceType}:`, error);
            throw error;
        }
    }
    async get(resourceType, id) {
        try {
            const response = await this.client.get(`/${resourceType}/${id}`);
            return response.data;
        }
        catch (error) {
            console.error(`Error getting ${resourceType}/${id}:`, error);
            throw error;
        }
    }
    async executeQuery(queryParams) {
        try {
            const params = this.buildSearchParams(queryParams);
            const response = await this.client.get(`/${queryParams.resourceType}?${params}`);
            return this.formatResults(response.data, queryParams.resourceType);
        }
        catch (error) {
            console.error("Error executing query:", error);
            return this.handleError(error);
        }
    }
    async getActiveConditions() {
        try {
            // HAPI FHIR uses clinical-status=active
            const response = await this.client.get('/Condition?clinical-status=active');
            return this.formatResponse("fhir://Condition/active", response.data);
        }
        catch (error) {
            console.error("Error getting active conditions:", error);
            return this.handleError(error);
        }
    }
    async findPatient(args) {
        try {
            const params = new URLSearchParams();
            if (args.lastName)
                params.append('family', args.lastName);
            if (args.firstName)
                params.append('given', args.firstName);
            if (args.birthDate)
                params.append('birthdate', args.birthDate);
            if (args.gender)
                params.append('gender', args.gender);
            const response = await this.client.get(`/Patient?${params}`);
            // Check if we have results
            if (!response.data?.entry?.[0]?.resource) {
                return this.formatResponse("fhir://Patient/search", { message: "No patients found" });
            }
            const resource = response.data.entry[0].resource;
            const name = resource.name?.[0] ?? {};
            const address = resource.address?.[0] ?? {};
            const patient = {
                name: name.given?.[0] ?? 'Unknown',
                familyName: name.family ?? 'Unknown',
                dob: resource.birthDate ?? 'Unknown',
                gender: resource.gender ?? 'Unknown',
                address: address.line?.[0] ?? 'Unknown',
                city: address.city ?? 'Unknown',
                state: address.state ?? 'Unknown',
                zip: address.postalCode ?? 'Unknown',
                id: resource.id ?? 'Unknown'
            };
            return this.formatResponse("fhir://Patient/search", patient);
        }
        catch (error) {
            console.error("Error finding patient:", error);
            return this.handleError(error);
        }
    }
    handleError(error) {
        let errorMessage = "Unknown error occurred";
        if (axios.isAxiosError(error)) {
            // HAPI FHIR typically returns OperationOutcome resource for errors
            if (error.response?.data?.resourceType === 'OperationOutcome' && error.response.data.issue?.length > 0) {
                // Extract error details from OperationOutcome
                errorMessage = `FHIR API error: ${error.response.data.issue.map((i) => `[${i.severity}] ${i.diagnostics || i.details?.text || i.code}`).join('; ')}`;
            }
            else {
                // Fallback to standard error message
                errorMessage = `FHIR API error: ${error.response?.data?.issue?.[0]?.details?.text ?? error.message}`;
            }
        }
        else if (error.message) {
            errorMessage = error.message;
        }
        return { content: [{ type: "text", text: errorMessage }], isError: true };
    }
    buildSearchParams(queryParams) {
        const params = new URLSearchParams();
        if (queryParams.codes?.length)
            params.append('code', queryParams.codes.join(','));
        if (queryParams.dateRange) {
            if (queryParams.dateRange.start)
                params.append('date', `ge${queryParams.dateRange.start}`);
            if (queryParams.dateRange.end)
                params.append('date', `le${queryParams.dateRange.end}`);
        }
        return params;
    }
    formatResults(data, resourceType) {
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    formatResponse(uri, data) {
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(data, null, 2)
                }]
        };
    }
    async getPatientObservations(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.code)
                params.append('code', args.code);
            if (args.status)
                params.append('status', args.status);
            if (args.dateFrom)
                params.append('date', `ge${args.dateFrom}`);
            if (args.dateTo)
                params.append('date', `le${args.dateTo}`);
            const response = await this.client.get(`/Observation?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/observations`, response.data);
        }
        catch (error) {
            console.error("Error getting patient observations:", error);
            return this.handleError(error);
        }
    }
    async getPatientConditions(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.status)
                params.append('clinical-status', args.status);
            if (args.onsetDate)
                params.append('onset-date', args.onsetDate);
            const response = await this.client.get(`/Condition?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/conditions`, response.data);
        }
        catch (error) {
            console.error("Error getting patient conditions:", error);
            return this.handleError(error);
        }
    }
    async getPatientMedications(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.status)
                params.append('status', args.status);
            const response = await this.client.get(`/MedicationRequest?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/medications`, response.data);
        }
        catch (error) {
            console.error("Error getting patient medications:", error);
            return this.handleError(error);
        }
    }
    async getPatientEncounters(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.status)
                params.append('status', args.status);
            if (args.dateFrom)
                params.append('date', `ge${args.dateFrom}`);
            if (args.dateTo)
                params.append('date', `le${args.dateTo}`);
            const response = await this.client.get(`/Encounter?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/encounters`, response.data);
        }
        catch (error) {
            console.error("Error getting patient encounters:", error);
            return this.handleError(error);
        }
    }
    async getPatientAllergies(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', args.patientId);
            if (args.status)
                params.append('clinical-status', args.status);
            if (args.type)
                params.append('type', args.type);
            if (args.category)
                params.append('category', args.category);
            const response = await this.client.get(`/AllergyIntolerance?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/allergies`, response.data);
        }
        catch (error) {
            console.error("Error getting patient allergies:", error);
            return this.handleError(error);
        }
    }
    async getPatientProcedures(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.status)
                params.append('status', args.status);
            if (args.dateFrom)
                params.append('date', `ge${args.dateFrom}`);
            if (args.dateTo)
                params.append('date', `le${args.dateTo}`);
            const response = await this.client.get(`/Procedure?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/procedures`, response.data);
        }
        catch (error) {
            console.error("Error getting patient procedures:", error);
            return this.handleError(error);
        }
    }
    async getPatientCareTeam(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.status)
                params.append('status', args.status);
            const response = await this.client.get(`/CareTeam?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/careteam`, response.data);
        }
        catch (error) {
            console.error("Error getting patient care team:", error);
            return this.handleError(error);
        }
    }
    async getPatientCarePlans(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.status)
                params.append('status', args.status);
            if (args.category)
                params.append('category', args.category);
            if (args.dateFrom)
                params.append('date', `ge${args.dateFrom}`);
            if (args.dateTo)
                params.append('date', `le${args.dateTo}`);
            const response = await this.client.get(`/CarePlan?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/careplans`, response.data);
        }
        catch (error) {
            console.error("Error getting patient care plans:", error);
            return this.handleError(error);
        }
    }
    async getPatientVitalSigns(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            params.append('category', 'vital-signs');
            if (args.dateFrom)
                params.append('date', `ge${args.dateFrom}`);
            if (args.dateTo)
                params.append('date', `le${args.dateTo}`);
            const response = await this.client.get(`/Observation?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/vital-signs`, response.data);
        }
        catch (error) {
            console.error("Error getting patient vital signs:", error);
            return this.handleError(error);
        }
    }
    async getMedicationHistory(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.dateFrom)
                params.append('date', `ge${args.dateFrom}`);
            if (args.dateTo)
                params.append('date', `le${args.dateTo}`);
            const response = await this.client.get(`/MedicationStatement?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/medication-history`, response.data);
        }
        catch (error) {
            console.error("Error getting medication history:", error);
            return this.handleError(error);
        }
    }
    async getPatientLabResults(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            params.append('category', 'laboratory');
            if (args.dateFrom)
                params.append('date', `ge${args.dateFrom}`);
            if (args.dateTo)
                params.append('date', `le${args.dateTo}`);
            const response = await this.client.get(`/Observation?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/lab-results`, response.data);
        }
        catch (error) {
            console.error("Error getting patient lab results:", error);
            return this.handleError(error);
        }
    }
    async getPatientAppointments(args) {
        try {
            const params = new URLSearchParams();
            params.append('patient', `${args.patientId}`);
            if (args.dateFrom)
                params.append('date', `ge${args.dateFrom}`);
            if (args.dateTo)
                params.append('date', `le${args.dateTo}`);
            const response = await this.client.get(`/Appointment?${params}`);
            return this.formatResponse(`fhir://Patient/${args.patientId}/appointments`, response.data);
        }
        catch (error) {
            console.error("Error getting patient appointments:", error);
            return this.handleError(error);
        }
    }
    async getVitalSigns(patientId, timeframe) {
        try {
            const params = {
                patient: patientId,
                category: 'vital-signs',
                _sort: '-date',
                _count: '50'
            };
            if (timeframe) {
                const date = calculateTimeframeDate(timeframe);
                if (date) {
                    params["date"] = `ge${date}`;
                }
            }
            const response = await this.client.get(`/Observation?${new URLSearchParams(params)}`);
            return response.data;
        }
        catch (error) {
            console.error("Error getting vital signs:", error);
            throw error;
        }
    }
    async getPatientSummaryData(patientId) {
        try {
            const [patient, conditions, medications, allergies, immunizations, procedures, carePlans, recentLabs, encounters, appointments] = await Promise.all([
                this.get("Patient", patientId),
                this.search("Condition", { patient: patientId }),
                this.search("MedicationRequest", { patient: patientId }),
                this.search("AllergyIntolerance", { patient: patientId }),
                this.search("Immunization", { patient: patientId }),
                this.search("Procedure", { patient: patientId }),
                this.search("CarePlan", { patient: patientId }),
                this.getPatientLabData(patientId),
                this.search("Encounter", { patient: patientId }),
                this.search("Appointment", { patient: patientId })
            ]);
            return {
                patient,
                conditions,
                medications,
                allergies,
                immunizations,
                procedures,
                carePlans,
                recentLabs,
                encounters,
                appointments
            };
        }
        catch (error) {
            console.error("Error getting patient summary data:", error);
            throw error;
        }
    }
    // Additional helper functions for other prompts
    async getPatientConditionData(patientId, timeframe) {
        try {
            const searchParams = {
                patient: patientId,
                _sort: "date"
            };
            if (timeframe) {
                const date = calculateTimeframeDate(timeframe);
                if (date) {
                    searchParams["date"] = `ge${date}`;
                }
            }
            return await this.search("Condition", searchParams);
        }
        catch (error) {
            console.error("Error getting patient condition data:", error);
            throw error;
        }
    }
    async getPatientLabData(patientId, labType) {
        try {
            const searchParams = {
                patient: patientId,
                category: "laboratory",
                _sort: "-date"
            };
            if (labType) {
                searchParams["code"] = labType;
            }
            return await this.search("Observation", searchParams);
        }
        catch (error) {
            console.error("Error getting patient lab data:", error);
            throw error;
        }
    }
    async getPatientCareGapsData(patientId) {
        try {
            const [patient, immunizations, procedures, carePlans] = await Promise.all([
                this.get("Patient", patientId),
                this.search("Immunization", { patient: patientId }),
                this.search("Procedure", { patient: patientId }),
                this.search("CarePlan", { patient: patientId, status: "active" })
            ]);
            return {
                patient,
                immunizations,
                procedures,
                carePlans
            };
        }
        catch (error) {
            console.error("Error getting patient care gaps data:", error);
            throw error;
        }
    }
    getRelevantMetrics(observations, condition) {
        // Map conditions to relevant LOINC codes
        const metricMap = {
            'Diabetes': ['4548-4', '17856-6'], // HbA1c, Glucose
            'Hypertension': ['8480-6', '8462-4'], // Systolic BP, Diastolic BP
            'Hyperlipidemia': ['2093-3', '2571-8'], // Cholesterol, Triglycerides
        };
        const conditionName = condition.code?.coding?.[0]?.display || '';
        const relevantCodes = metricMap[conditionName] || [];
        return observations
            .filter((obs) => {
            const obsCode = obs.resource.code?.coding?.[0]?.code;
            return relevantCodes.includes(obsCode);
        })
            .map((obs) => {
            const value = obs.resource.valueQuantity?.value || 'No value';
            const unit = obs.resource.valueQuantity?.unit || '';
            const date = obs.resource.effectiveDateTime?.split('T')[0] || 'unknown date';
            const name = obs.resource.code?.coding?.[0]?.display || 'Unknown metric';
            return `${name}: ${value} ${unit} (${date})`;
        });
    }
}
