const googleTranslate = (text, location) => {
  // const projectId = 'YOUR_PROJECT_ID';
  // const location = 'global';
  // const text = 'text to translate';


  // Imports the Google Cloud Translation library
  const {TranslationServiceClient} = require('@google-cloud/translate').v3beta1;

  // Instantiates a client
  const translationClient = new TranslationServiceClient();
  async function translateText() {
    // Construct request
    const request = {
      parent: translationClient.locationPath(projectId, location),
      contents: [text],
      mimeType: 'text/plain', // mime types: text/plain, text/html
      sourceLanguageCode: 'en-US',
      targetLanguageCode: 'sr-Latn',
    };

    // Run request
    const [response] = await translationClient.translateText(request);

    for (const translation of response.translations) {
      console.log(`Translation: ${translation.translatedText}`);
    }
  }

  translateText();
}