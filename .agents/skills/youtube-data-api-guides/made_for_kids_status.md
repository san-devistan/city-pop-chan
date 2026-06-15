# Finding the MadeForKids status of a video Stay organized with collections Save and categorize content based on your preferences.
## Page Summary
- Content designated as "MadeForKids" (MFK) on YouTube requires special handling due to specific legal requirements.
- Embedding MFK YouTube videos mandates disabling tracking and ensuring data collection complies with laws like COPPA.
- The YouTube Data API Service can be used to determine if a video is designated as MFK by calling the videos.list endpoint.
- You must use a Google developer account and add the YouTube API to a project to use the YouTube Data API.
- The status.madeForKids property within the videos resource will define if the video is an MFK video or not, when using the videos.list endpoint.
Interactions with YouTube content that is specifically directed towards children, which YouTube labels "MadeForKids" or "MFK", require special care and attention.
As an example, if you embed a YouTube video that is designated MadeForKids on your site or app, you are required by Section III.E.4.j of the Developer Policies to turn off tracking and make sure that all data collection, with respect to that player, is compliant with applicable laws, including U.S. Children's Online Privacy Protection Act (COPPA).
If you are not sure whether a video is designated MadeForKids, you can check the status of a video at any given time via the YouTube Data API Service following the instructions outlined below:
1. Create or access your Google developer account via https://console.cloud.google.com/ .
2. Add the YouTube API to your selected API Project (if you haven’t already). Note that the default YouTube API Services quota is 10,000 daily quota points; this is sufficient to check the MadeForKids video status of up to 5000 videos.
3. Using the YouTube Data API Service, call the videos.list endpoint. Include the relevant Video ID(s) in the request parameters. Include, at minimum, the id and status parts in the request's part parameter.
4. Check the video resource returned for the MFK status, which is returned in the resource's status.madeForKids property.
You can learn more about MadeForKids guidelines in the YouTube Help Center .