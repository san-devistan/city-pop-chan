# Resumable Uploads Stay organized with collections Save and categorize content based on your preferences.
## Page Summary
- Resumable video uploads via Google APIs allow for uploads to be paused and resumed, improving reliability, especially with large files or unstable connections.
- The process begins with a POST request to initiate a session, receiving a unique upload URL in the Location header, which is saved for subsequent steps.
- The actual video file upload is done via PUT requests to the session URL, including specific headers like Content-Length , Content-Type , and Content-Range , as well as the binary file data in the body.
- In case of interruptions, the upload status can be queried using another PUT request, and then resumed from the last successful point, indicated by the Range header in the 308 response.
- Chunked uploading allows for videos to be uploaded in smaller segments, useful for progress indicators and unstable networks, but it increases the amount of requests which might affect performance.
You can upload videos more reliably by using the resumable upload protocol for Google APIs. This protocol lets you resume an upload operation after a network interruption or other transmission failure, saving time and bandwidth in the event of network failures.
Using resumable uploads is especially useful in any of the following cases:
You are transferring large files. The likelihood of a network interruption is high. Uploads are originating from a device with a low-bandwidth or unstable Internet connection, such as a mobile device.
This guide explains the sequence of HTTP requests that an application makes to upload videos using a resumable uploading process. This guide is primarily intended for developers who cannot use the Google API client libraries , some of which provide native support for resumable uploads. In fact, the YouTube Data API - Uploading a Video guide explains how to use the Google APIs Client Library for Python to upload a video using a resumable uploading process.
Note: You can also see the series of request made for resumable uploading or any other API operation by using one of the Google API client libraries with HTTPS logging enabled. For example, to enable the HTTP trace for Python, use the httplib2 library:
```
httplib2.debuglevel = 4
```
## Step 1 - Start a resumable session
To start a resumable video upload, send a POST request to the following URL. In the URL, set the part parameter value to the appropriate value for your request. Remember that the parameter value identifies the parts the contain properties that you are setting, and it also identifies the parts that you want the API response to include. Parameter values in the request URL must be URL-encoded.
```
https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable∂=
PARTS
```
Set the body of the request to a video resource. Also set the following HTTP request headers:
Authorization – The authorization token for the request. Content-Length – The number of bytes provided in the body of the request. Note that you do not need to provide this header if you are using chunked transfer encoding . Content-Type – Set the value to application/json; charset=UTF-8 . X-Upload-Content-Length – The number of bytes that will be uploaded in subsequent requests. Set this value to the size of the file you are uploading. x-upload-content-type – the MIME type of the file that you are uploading. You can upload files with any video MIME type ( video/* ) or a MIME type of application/octet-stream .
the following example shows how to initiate a resumable session for uploading a video. the request sets (and will retrieve) properties in the video resource's snippet and status parts, and it will also retrieve properties in the resource's contentdetails part.
```
post
 
/
upload
/
youtube
/
v3
/
videos
?
uploadType
=
resumable
&
part
=
parts
 
http
/
1.1

host
:
 
www
.
googleapis
.
com

authorization
:
 
bearer
 
auth_token

content
-
length
:
 
content_length

content
-
type
:
 
application
/
json
;
 
charset
=
utf
-
8

x
-
upload
-
content
-
length
:
 
x_upload_content_length

X
-
Upload
-
Content
-
Type
:
 
X_UPLOAD_CONTENT_TYPE

video
 
resource
```
The following example shows a POST request that has all of these values populated with the exception of the authentication token. The categoryId value in the example corresponds to a video category. The list of supported categories can be retrieved using the API's videoCategories.list method.
```
POST
 
/upload/youtube/v3/videos?uploadType=resumable∂=snippet,status,contentDetails
 
HTTP
/
1.1

Host
:
 
www.googleapis.com

Authorization
:
 
Bearer 
AUTH_TOKEN

Content-Length
:
 
278

Content-Type
:
 
application/json; charset=UTF-8

X-Upload-Content-Length
:
 
3000000

X-Upload-Content-Type
:
 
video/*

{

  
"snippet"
:
 
{

    
"title"
:
 
"My video title"
,

    
"description"
:
 
"This is a description of my video"
,

    
"tags"
:
 
[
"cool"
,
 
"video"
,
 
"more keywords"
],

    
"categoryId"
:
 
22

  
},

  
"status"
:
 
{

    
"privacyStatus"
:
 
"public"
,

    
"embeddable"
:
 
True
,

    
"license"
:
 
"youtube"

  
}

}
```
## Step 2 - Save the resumable session URI
If your request succeeds, the API server will respond with a 200 ( OK ) HTTP status code, and the response will include a Location HTTP header that specifies the URI for the resumable session. This is the URI that you will use to upload your video file.
The example below shows a sample API response to the request in step 1:
```
HTTP/1.1 200 OK

Location: https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=xa298sd_f∂=snippet,status,contentDetails

Content-Length: 0
```
## Step 3 - Upload the video file
After extracting the session URI from the API response, you then need to upload the actual video file content to that location. The body of the request is the binary file content for the video that you are uploading. The example below shows the request's format.
```
PUT 
UPLOAD_URL
 HTTP/1.1
Authorization: Bearer 
AUTH_TOKEN

Content-Length: 
CONTENT_LENGTH

Content-Type: 
CONTENT_TYPE

BINARY_FILE_DATA
```
The request sets the following HTTP request headers:
Authorization – The authorization token for the request. Content-Length – The size of the file that you are uploading. This value should be the same as the value of the X-Upload-Content-Length HTTP request header in step 1. Content-Type – The MIME type of the file that you are uploading. This value should be the same as the value of the X-Upload-Content-Type HTTP request header in step 1.
## Step 4 - Complete the upload process
Your request will lead to one of the following scenarios:
- Your upload is successful. The API server responds with an HTTP 201 ( Created ) response code. The body of the response is the video resource that you created.
- Your upload did not succeed, but can be resumed. You should be able to resume an upload in either of the following cases: Your request is interrupted because the connection between your application and the API server is lost. In this case, you will not receive an API response. The API response specifies any of the following 5xx response codes. Your code should use an exponential backoff strategy when resuming uploads after receiving any of these response codes. 500 – Internal Server Error 502 – Bad Gateway 503 – Service Unavailable 504 – Gateway Timeout To resume an upload, follow the instructions for checking the upload's status and resuming an upload below. Remember that each resumable session URI has a finite lifetime and eventually expires. For this reason, we recommend starting a resumable upload as soon as you obtain the session URI and resuming an interrupted upload shortly after the interruption occurs.
- Your upload failed permanently. For a failed upload, the response contains an error response that helps to explain the cause of the failure. For an upload that fails permanently, the API response will have a 4xx response code or a 5xx response code other than the ones listed above. If you send a request with an expired session URI, the server returns a 404 HTTP response code ( Not Found ). In this case, you will need to start a new resumable upload, obtain a new session URI, and start the upload from the beginning using the new URI.
### Step 4.1: Check the status of an upload
To check the status of an interrupted resumable upload, send an empty PUT request to the upload URL that you retrieved in step 2 and also used in step 3. In your request, set the Content-Range header value to bytes */ CONTENT_LENGTH , where CONTENT_LENGTH is the size of the file you are uploading.
```
PUT 
UPLOAD_URL
 HTTP/1.1
Authorization: Bearer 
AUTH_TOKEN

Content-Length: 0
Content-Range: bytes */
CONTENT_LENGTH
```
### Step 4.2: Process the API response
If the upload already completed, regardless of whether it succeeded or failed, the API will return the same response that it sent when the upload originally completed.
However, if the upload was interrupted or is still in progress, the API response will have an HTTP 308 ( Resume Incomplete ) response code. In the response, the Range header specifies how many bytes of the file have already been successfully uploaded.
The header value is indexed from 0 . As such, a header value of 0-999999 indicates that the first 1,000,000 bytes of the file have been uploaded. If nothing has been uploaded yet, the API response will not include the Range header.
The sample response below shows the format of an API response for a resumable upload:
```
308 Resume Incomplete
Content-Length: 0

Range: bytes=0-999999
```
If the API response also includes the Retry-After header, use that header's value to determine when to attempt to resume the upload.
### Step 4.3: Resume the upload
To resume the upload, send another PUT request to the upload URL captured in step 2. Set the request body to the binary code for the portion of the video file that has not yet been uploaded.
```
PUT 
UPLOAD_URL
 HTTP/1.1
Authorization: Bearer 
AUTH_TOKEN

Content-Length: 
REMAINING_CONTENT_LENGTH

Content-Range: bytes 
FIRST_BYTE
-
LAST_BYTE
/
TOTAL_CONTENT_LENGTH

PARTIAL_BINARY_FILE_DATA
```
You need to set the following HTTP request headers:
- Authorization – The authorization token for the request.
- Content-Length – The size, in bytes, of the content that has not yet been uploaded. If you are uploading the remainder of a file, you can calculate this value by subtracting the FIRST_BYTE value from the TOTAL_CONTENT_LENGTH value. Both values are used in the Content-Range header.
- Content-Range – The portion of the file that you are uploading. The header value comprises three values: FIRST_BYTE – The 0-based numeric index of the byte number from which you are resuming the upload. This value is one number higher than the second number in the Range header retrieved in the previous step. In the previous example, the Range header value was 0-999999 , so the first byte in a subsequent resumed upload would be 1000000 . LAST_BYTE – The 0-based numeric index of the last byte of the binary file that you are uploading. Typically, this is the last byte in the file. So, for example, if the file size was 3000000 bytes, the last byte in the file would be number 2999999 . TOTAL_CONTENT_LENGTH – The total size of the video file in bytes. This value is the same as the Content-Length header specified in the original upload request . Note: You cannot upload a noncontinuous block of the binary file. If you try to upload a noncontinuous block, none of the remaining binary content will be uploaded. As such, the first byte uploaded in a resumed upload must be the next byte after the last byte that had already been successfully uploaded to YouTube. (See the discussion of the Range header in step 4.2 . Thus, if the last byte in the Range header is 999999 , the first byte in the request to resume the upload must be byte 1000000. (Both numbers use a 0-based index.) If you try to resume the upload from byte 999999 or lower (overlapping bytes) or byte 1000001 or higher (skipping bytes), none of the binary content will be uploaded.
## Upload a file in chunks
Instead of trying to upload an entire file and resuming the upload in event of a network interruption, your application can break the file into chunks and send a series of requests to upload the chunks in sequence. This approach is rarely necessary and is actually discouraged because it requires additional requests, which have performance implications. However, it might be useful if you are trying to display a progress indicator on a very unstable network.
The instructions for uploading a file in chunks are virtually identical to the four-step process explained earlier in this guide. However, the requests to start uploading a file (step 3 above) and to resume an upload (step 4.3 above) both set the Content-Length and Content-Range header values differently when a file is being uploaded in chunks.
- The Content-Length header value specifies the size of the chunk that the request is sending. Note the following restrictions on chunk sizes: The chunk size must be a multiple of 256 KB. (This restriction does not apply to the last chunk since the size of the entire file may not be a multiple of 256 KB.) Remember that larger chunks are more efficient. The chunk size must be the same for each request in the upload sequence with the exception of the last request, which specifies the size of the final chunk.
- The Content-Range header specifies the bytes in the file that the request is uploading. The instructions for setting the Content-Range header in step 4.3 are applicable when setting this value. For example, a value of bytes 0-524287/2000000 shows that the request is sending the first 524,288 bytes (256 x 2048) in a 2,000,000 byte file.
The example below shows the format of the first of a series of requests that will upload a 2,000,000 byte file in chunks:
```
PUT
 
UPLOAD_URL
 
HTTP
/
1.1

Authorization
:
 
Bearer 
AUTH_TOKEN

Content-Length
:
 
524888

Content-Type
:
 
video/*

Content-Range
:
 
bytes 
0
-
524287
/
2000000

{bytes 0-524287}
```
If a request other than the final request succeeds, the API server responds with a 308 ( Resume Incomplete ) response. The response format will be the same as that described in Step 4.2: Process the API response above.
Use the upper value returned in the API response's Range header to determine where to start the next chunk. Continue to send PUT requests, as described in Step 4.3: Resume the upload , to upload subsequent file chunks until the entire file has been uploaded.
When the entire file has been uploaded, the server responds with a 201 HTTP response code ( Created ) and returns the requested parts of the newly created video resource.
If any request is interrupted or your application receives any 5xx response code, follow the procedure explained in step 4 to complete the upload. However, instead of attempting to upload the rest of the file, just continue uploading chunks from the point where you are resuming the upload. Be sure to use the check the upload's status to determine where to resume the file upload. Do not assume that the server received all (or none) of the bytes sent in the previous request.
Note: You can also request the status of an active upload between uploaded chunks. (The upload does not need to have been interrupted before you can retrieve its status.)