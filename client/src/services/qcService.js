import api from '../lib/axios';

// Evaluate a document using design and checklist file
export const evaluateDocument = async (designFile, checklistFile) => {
  try {
    const formData = new FormData();
    formData.append('design', designFile);
    formData.append('checklist', checklistFile);

    const response = await api.post('/qc/evaluate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data; // expected: { score, passed, failed, download, previewUrl }
  } catch (error) {
    console.error('Failed to evaluate document:', error);
    throw error.response?.data || { error: 'Unknown error occurred during evaluation' };
  }
};
