# Implementation: Activities Stay organized with collections Save and categorize content based on your preferences.
## Page Summary
- YouTube is removing the channel bulletin feature, which impacts how channel activity is managed.
- The activities.insert method will be deprecated, and activities.list will no longer return channel bulletins after May 18, 2020.
- You can retrieve a list of channel activities using the activities.list method by either setting the mine parameter to true for the authenticated user or by specifying a channelId for a particular channel.
- To view subscription activities for the authenticated user, you must use the activities.list method with the home parameter set to true .
The following examples show how to use the YouTube Data API (v3) to perform functions related to user activity.
## Retrieve a list of channel activities
To retrieve a list of events related to a particular channel, call the activities.list method using one of the following two methods to identify the channel:
- Set the mine parameter value to true to retrieve a list of the currently authenticated user's activities. Your request must be authorized using OAuth 2.0. https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.activities.list? part=snippet,contentDetails &mine=true
- Set the channelId parameter to the YouTube channel ID that uniquely identifies the channel for which you are retrieving an activity list. This example sets the channelId parameter to UCK8sQmJBp8GCxrOtXWBpyEA , which also identifies Google's official YouTube channel. https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.activities.list? part=snippet,contentDetails &channelId=UCK8sQmJBp8GCxrOtXWBpyEA