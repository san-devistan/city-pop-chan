# Implementation: Ratings Stay organized with collections Save and categorize content based on your preferences.
## Page Summary
- The YouTube Data API (v3) allows users to rate videos using the videos.rate method, with options to like , dislike , or remove a rating ( none ), requiring OAuth 2.0 authorization.
- You can retrieve the currently authenticated user's rating for specific videos by using the videos.getRating method and providing a comma-separated list of video IDs, also requiring OAuth 2.0.
- The API enables the retrieval of a list of videos rated by the current user, either liked or disliked, through the videos.list method and its myRating parameter, which also requires OAuth 2.0.
- Alternatively, users can retrieve a list of their liked videos by using the playlistItems.list method and accessing the contentDetails.relatedPlaylists.likes property, which offers an alternative to the videos.list method.
The following examples show how to use the YouTube Data API (v3) to perform functions related to video ratings.
## Rate a video
Call the videos.rate method to submit a user's rating for a video. This request must be authorized using OAuth 2.0.
Set the following two parameters in your request:
The id parameter specifies the YouTube video ID of the video that is being rated (or having its rating removed). The rating parameter specifies the rating that the user authorizing the request wishes to record. Valid parameter values are like , dislike , and none . The first two values set a rating, and the third removes any rating that previously existed for the user.
The sample request below gives a positive (like) rating to the video of the keynote speech at the 2014 Google I/O conference:
```
https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.videos.rate?
        id=wtLJPvx7-ys
        &rating=like
```
## Retrieve the current user's rating of a video
The videos.getRating method lets you retrieve the currently authenticated user's rating of one or more videos. In your request, set the id parameter's value to a comma-separated list of YouTube video IDs for the resources for which you are retrieving rating data. Note that this request must be authorized using OAuth 2.0.
The sample request below retrieves the current user's rating of the video of the keynote speech at the 2014 Google I/O conference. (If you executed the previous example in the APIs Explorer, the API response should indicate that the rating is like .
```
https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.videos.getRating?
id=wtLJPvx7-ys
```
## Retrieve videos rated by the current user
The videos.list method's myRating parameter lets you retrieve a list of videos rated by the user authorizing the API request. The parameter value indicates whether you want to retrieve liked or disliked videos.
The sample request below retrieves a list of videos to which the current user gave a like rating. The request must be authorized using OAuth 2.0.
```
https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.videos.list?
part=snippet
&myRating=like
```