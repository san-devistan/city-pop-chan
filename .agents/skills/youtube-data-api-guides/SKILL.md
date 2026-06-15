---
name: youtube-data-api-guides
description: "Documentation for the YouTube Data API v3 guides from developers.google.com. Use when the user asks about YouTube Data API, youtube-data-api-guides, YouTube API v3, OAuth 2.0 authorization for YouTube, service accounts, access scopes, videos.insert uploads, resumable uploads, quota and compliance audits, push notifications, channel IDs, partial responses, pagination, or implementation examples from https://developers.google.com/youtube/v3/guides."
---

# YouTube Data API v3 Guides

> 24 pages crawled from [https://developers.google.com/youtube/v3/guides](https://developers.google.com/youtube/v3/guides)

This `SKILL.md` is an index, not the full documentation. The actual docs are the linked markdown files in this skill folder.

## Required Lookup

When this skill triggers for a documentation question:

1. Search this skill folder or choose the relevant entry from Contents.
2. Read at least one linked `.md` file before answering API, syntax, configuration, behavior, migration, or troubleshooting questions.
3. Read multiple files when the answer spans concepts, examples, reference pages, or framework integrations.
4. Treat the local markdown files as the source of truth. If the local docs do not cover the question, say that instead of filling gaps from memory.

## Overview

These guides explain how to authorize and call the YouTube Data API v3 for user-owned YouTube data, including OAuth 2.0 flows for web servers, JavaScript apps, installed apps, and limited-input devices. They also cover request mechanics such as `part`, `fields`, pagination tokens, resumable video upload sessions, push notifications, channel ID handling, quota and compliance audit workflows, and resource-specific implementation examples for videos, playlists, comments, captions, channels, subscriptions, ratings, activities, and search.

## Contents

### Core Concepts and Request Mechanics

- [Implementing OAuth 2.0 Authorization](authentication.md)
- [Implementation Guide](implementation.md)
- [Partial Responses](implementation/partial.md)
- [Pagination](implementation/pagination.md)
- [Work with Channel IDs](working_with_channel_ids.md)

### OAuth 2.0 Authorization Flows

- [Using OAuth 2.0 for Web Server Applications](auth/server-side-web-apps.md)
- [Using OAuth 2.0 for JavaScript Web Applications](auth/client-side-web-apps.md)
- [OAuth 2.0 for Mobile and Desktop Apps](auth/installed-apps.md)
- [OAuth 2.0 for TV and Limited-Input Device Applications](auth/devices.md)
- [Move from ClientLogin to OAuth 2.0](moving_to_oauth.md)

### Uploads, Video Lifecycle, and Notifications

- [Upload a Video](uploading_a_video.md)
- [Resumable Uploads](using_resumable_upload_protocol.md)
- [Finding the MadeForKids Status of a Video](made_for_kids_status.md)
- [Subscribe to Push Notifications](push_notifications.md)

### Resource Implementation Examples

- [Implementation: Activities](implementation/activities.md)
- [Implementation: Captions](implementation/captions.md)
- [Implementation: Channels](implementation/channels.md)
- [Implementation: Comments](implementation/comments.md)
- [Implementation: Playlists](implementation/playlists.md)
- [Implementation: Ratings](implementation/ratings.md)
- [Implementation: Search Requests](implementation/search.md)
- [Implementation: Subscriptions](implementation/subscriptions.md)
- [Implementation: Videos](implementation/videos.md)

### Policy, Quota, and Compliance

- [Quota and Compliance Audits](quota_and_compliance_audits.md)

## Search Hints

- Use the Contents section when the topic maps cleanly to a page.
- Use text search inside this skill folder when the topic could appear in many pages, for example `rg -n "<api-or-topic>" .`.
- Prefer files with exact API names, component names, config keys, or error messages.
- For auth answers, search for the target app type first, then check `authentication.md` for YouTube-specific OAuth scope and service account notes.
- For upload answers, read `uploading_a_video.md` for client-library samples and `using_resumable_upload_protocol.md` for the raw HTTP resumable protocol.
