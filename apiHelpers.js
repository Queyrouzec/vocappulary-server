const {TranslationServiceClient} = require('@google-cloud/translate').v3beta1;


const googleTranslate = (text, langFrom, langTo) => {
  const projectId = process.env.GOOGLE_PROJECT;
  const location = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  // const text = 'text to translate';


  // Imports the Google Cloud Translation library

  // Instantiates a client
  const translationClient = new TranslationServiceClient();
  async function translateText() {
    // Construct request
    const request = {
      parent: translationClient.locationPath(projectId, location),
      contents: [text],
      mimeType: 'text/plain', // mime types: text/plain, text/html
      sourceLanguageCode: langFrom,// 'en-US',
      targetLanguageCode: langTo,// 'sr-Latn',
    };

    // Run request
    const [response] = await translationClient.translateText(request);

    for (const translation of response.translations) {
      console.log(`Translation: ${translation.translatedText}`);
    }
  }

  translateText();
}

googleTranslate("hi", 'en-US', 'sr-Latn')

module.exports.apiFuncs = {
  googleTranslate,
}