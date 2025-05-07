// Test script for HAPI FHIR server
import { FhirClient } from './build/server/connectors/fhir/FhirClient.js';

// Create a client for the public HAPI FHIR server
const client = new FhirClient('http://hapi.fhir.org/baseR4', false);

async function testHapiFhir() {
  try {
    console.log('Testing connection to HAPI FHIR server...');
    
    // Test 1: Search for patients
    console.log('\nTest 1: Searching for patients with family name "Smith"');
    const patientResult = await client.findPatient({ lastName: 'Smith' });
    console.log('Patient search result:', JSON.stringify(patientResult, null, 2));
    
    // Test 2: Get conditions if we found a patient
    if (patientResult.content[0].text.includes('No patients found')) {
      console.log('\nNo patients found, skipping condition test');
    } else {
      const patientData = JSON.parse(patientResult.content[0].text);
      console.log(`\nTest 2: Getting conditions for patient ID: ${patientData.id}`);
      const conditionsResult = await client.getPatientConditions({ patientId: patientData.id });
      console.log('Conditions result:', JSON.stringify(conditionsResult, null, 2));
    }
    
    // Test 3: Test error handling with an invalid resource
    console.log('\nTest 3: Testing error handling with invalid resource');
    try {
      await client.get('InvalidResource', '123');
    } catch (error) {
      const errorResult = client.handleError(error);
      console.log('Error handling result:', JSON.stringify(errorResult, null, 2));
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testHapiFhir();
