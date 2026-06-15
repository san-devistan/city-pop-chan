# Gemini API libraries
- On this page
- Language support and installation
- General availability
- Legacy libraries and migration
When building with the Gemini API, we recommend using the Google GenAI SDK . These are the official, production-ready libraries that we develop and maintain for the most popular languages. They are in General Availability and used in all our official documentation and examples.
If you're new to the Gemini API, follow our quickstart guide to get started.
## Language support and installation
The Google GenAI SDK is available for the Python, JavaScript/TypeScript, Go and Java languages. You can install each language's library using package managers, or visit their GitHub repos for further engagement:
- Library: google-genai
- GitHub Repository: googleapis/python-genai
- Installation: pip install google-genai
- Library: @google/genai
- GitHub Repository: googleapis/js-genai
- Installation: npm install @google/genai
- Library: google.golang.org/genai
- GitHub Repository: googleapis/go-genai
- Installation: go get google.golang.org/genai
- Library: google-genai
- GitHub Repository: googleapis/java-genai
- Installation: If you're using Maven, add the following to your dependencies:
```
<dependencies>

  
<dependency>

    
<groupId>com.google.genai</groupId>

    
<artifactId>google-genai</artifactId>

    
<version>1.0.0</version>

  
</dependency>
</dependencies>
```
- Library: Google.GenAI
- GitHub Repository: googleapis/dotnet-genai
- Installation: dotnet add package Google.GenAI
## General availability
As of May 2025, the Google GenAI SDK has reached General Availability (GA) across all supported platforms and are the recommended libraries to access the Gemini API. They are stable, fully supported for production use, and are actively maintained. They provide access to the latest features, and offer the best performance working with Gemini.
If you're using one of our legacy libraries, we strongly recommend you migrate so that you can access the latest features and get the best performance working with Gemini. Review the legacy libraries section for more information.
## Legacy libraries and migration
If you are using one of our legacy libraries, we recommend that you migrate to the new libraries .
The legacy libraries don't provide access to recent features (such as Live API and Veo ) and are deprecated as of November 30th, 2025.
Each legacy library's support status varies, detailed in the following table:
| Language | Legacy library | Support status | Recommended library |
| --- | --- | --- | --- |
| Python | google-generativeai | Not actively maintained | google-genai |
| JavaScript/TypeScript | @google/generativeai | Not actively maintained | @google/genai |
| Go | google.golang.org/generative-ai | Not actively maintained | google.golang.org/genai |
| Dart and Flutter | google_generative_ai | Not actively maintained | Use Genkit Dart or Firebase AI Logic |
| Swift | generative-ai-swift | Not actively maintained | Use Firebase AI Logic |
| Android | generative-ai-android | Not actively maintained | Use Firebase AI Logic |
Note for Java developers: There was no legacy Google-provided Java SDK for the Gemini API, so no migration from a previous Google library is required. You can start directly with the new library in the Language support and installation section.