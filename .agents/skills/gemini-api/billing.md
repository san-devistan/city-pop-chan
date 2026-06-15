# Billing
- On this page
- About billing and tiers
- Set up billing to access the Paid Tier Upgrade to the next paid tier
- Verify billing status
- Monitor usage
- Billing plans Prepay Postpay
- Spend caps Project spend caps Billing account tier spend caps
- Processing times
- Refunds
- Cloud Billing accounts Projects and API keys
- Frequently asked questions
This guide provides an overview of different Gemini API billing options, explains how to enable billing and monitor usage, and provides answers to frequently asked questions (FAQs) about billing.
## About billing and tiers
Billing for the Gemini API is based on your payment history.
| Usage tier | Qualification | Billing tier cap |
| --- | --- | --- |
| Free | Active project or free trial | N/A |
| Tier 1 | Set up and link an active billing account | $250 |
| Tier 2 | Paid $100 + 3 days from first successful payment | $2,000 |
| Tier 3 | Paid $1,000 + 30 days from first successful payment | $20,000 - $100,000+ |
New accounts begin on the Free Tier, which allows access to certain models in the Gemini API and AI Studio, up to the models' free tier rate limits .
To deploy your applications directly from Build mode, you can use the Google Cloud Starter Tier . This tier lets you publish up to 2 full stack applications without setting up a Google Cloud project or billing account. See Deploying from Google AI Studio for details and refer to the Google Cloud Starter Tier documentation for more information.
To access higher rate limits, use advanced models, and ensure your prompts and responses are not used to improve Google products * , you can link a billing account and prepay to move to the Paid Tiers. Then, you'll move through higher tiers based on cumulative spend and account age. At Tier 3, you may have the option to switch to postpay billing.
Tiers, rate limits, and billing account caps are all determined at the billing account level.
* Enterprise-grade data privacy: For more information on data use for paid services, see the Terms of Service .
## Set up billing to access the Paid Tier
You can create a project and set up billing, or import an existing project, to upgrade to the Paid Tier in Google AI Studio . Upgrading from the Free Tier to the Paid Tier means linking a billing account and prepaying to add a minimum of $10 (or equivalent in other currencies) of credits to your account.
1. Go to the AI Studio API keys page, Projects page, or anywhere you see Set up billing button in AI Studio. New users will have a project and API key created for them by default. If you need a new key, click Create API key and follow the dialog to add a key-project pair to the table.
2. Find the Free Tier project you want to upgrade to the Paid Tier, and click Set up billing under the Billing Tier column.
3. If you've never set up a Google billing account before: You'll be asked to select your country to agree to the Terms of Service. Then, fill in or confirm your contact information and payment method to continue.
4. If you have set up Google billing accounts in the past: You'll be asked to choose from your existing billing accounts. If you don't want to use any of your existing accounts, click Add new billing account and fill in or confirm your contact information and payment method to continue.
5. Next, you will either be: Asked to prepay a minimum of $10 to complete billing setup (meaning your account is auto-assigned to the Prepay billing plan), Given the choice between Prepay and Postpay billing plans for your account. Assigned to a Postpay billing plan for an intermediary period until the new Prepay system propagates to all users (starting March 23, 2026).
6. After prepaying or selecting Postpay, your account setup is complete.
### Upgrade to the next paid tier
If you're already on a paid tier and meet the criteria for a plan change, you will be automatically upgraded to the next tier (subject to processing times ).
## Verify billing status
After you have linked a billing account to your project, you can monitor its status on the AI Studio Billing page . Unlike the free tier, paid tier status is dynamic; while your usage tier is determined by your account history, the Gemini API will only serve requests if you have a positive Prepay credit balance.
On the Projects page, you'll be able to see your project's tier and billing plan under the Billing Tier column. Any billing status actions you may need to take for a project display in the Billing Tier or Status columns:
- " Set up billing " if the project doesn't have a billing account attached.
- " Set up prepay " if the project does have a billing account attached, but is required to use a Prepay billing plan that needs to be set up.
- " No available credits " if the billing account is required to purchase credits but the Prepay payments account isn't set up or the available credit balance is depleted.
Click any of the messages to proceed with the necessary actions.
## Monitor usage
You can monitor your usage of the Gemini API in Google AI Studio in Dashboard > Usage .
## Billing plans
Billing plans for the Gemini API and AI Studio fall into two categories that determine when you pay for usage: Prepay and Postpay. You can check your assigned billing plan and manage payment methods on the AI Studio Billing page.
### Prepay
In the Prepay billing plan, you purchase credits towards your prepay balance in advance of your Gemini API usage, and your API usage costs are deducted from your Prepay credit balance in near real-time . You can prepay by adding credits into your account, or setting up auto-reload . After credits are purchased, unused credits expire after 12 months and are non-refundable , except after switching to a Postpay account .
When your Prepay credit balance on the billing account hits $0, all API keys in all projects linked to that billing account will stop working simultaneously. Prepay credits apply only to Gemini API usage costs; you can't use them to pay for other Google Cloud services.
New users default to the Prepay billing plan. Projects that pre-date the introduction of Prepay and Postpay billing plans may need to update their project's billing details before continuing to use the Gemini API.
Note that Prepay is not available for Invoiced (or Offline) accounts.
#### Buy credits
You can manually purchase credits in advance of your Gemini API usage to load them into your Prepay account credit balance.
To purchase credits, go to the AI Studio Billing page and select Buy credits . The minimum purchase is $10. The maximum amount of credits you can prepay for is $5,000.
#### Auto reload
Auto-reload is an optional feature that automatically tops up your Prepay credit balance when it's running low. This is useful to prevent service interruptions.
You can set up auto reload and see your auto-reload status in the Available credits card on the AI Studio Billing page. Click Setup auto-reload or Manage auto-reload to set your payment method, reload amount, and the minimum balance that triggers a reload payment.
### Postpay
In the Postpay billing plan, your Cloud Billing account accrues costs and you are automatically charged at the end of the month, or when your costs reach an automatically assigned spend cap based on your account tier. The payment is charged to the payment method attached to your Postpay payments account, which you can manage on the AI Studio Billing page.
When you meet the Tier 3 criteria , you can manually switch from the Prepay plan to Postpay. To change plans, you will need to click the Switch to postpay button that appears in the top right of the AI Studio Billing page when your account becomes eligible.
Then, on the Billing page you'll be able to view your balance, due dates, and past payments, as well as make payments and manage payment methods.
When setting up billing for a new project, if you are eligible for Postpay, you will have the option to choose between Prepay and Postpay in the billing setup dialogue.
After you switch a Cloud Billing account to use the Postpay billing plan, all projects linked to that billing account are switched to the Postpay plan. You can't move that billing account back to the Prepay billing plan. You can move a project to a billing account with a different billing plan to change the charging cycle for that project; visit the Cloud documentation on managing billing for projects .
You can learn more about the Postpay charging cycle in the Cloud Billing guide .
## Spend caps
The Gemini API supports monthly spend caps at both the billing account tier and project levels. These controls are designed to protect your account from unexpected overages, and the ecosystem to ensure service availability.
Note that spend caps are not available for Invoiced (or Offline) accounts.
### Project spend caps
You can set your own project-level spend caps in AI Studio. This is useful if you have multiple projects under the same billing account and want to ensure each has access to enough of the cumulative spending limit.
Accounts with the project editor, owner, or admin roles can set spend caps per project in AI Studio on the Spend page under Monthly spend cap > Edit spend cap .
For details on the specific Google Cloud IAM permissions required to view or edit spend caps and billing information in AI Studio, see the AI Studio troubleshooting guide .
If you move a project to a different billing account , any spend cap you already set for that project will persist, but any accumulated spend will reset to $0 for the new billing cycle.
Long-running tasks like batch mode completions and agent sessions may incur overages beyond your project spend cap.
Billing data processing times can be delayed in AI Studio, up to around 10 minutes. You may experience overages beyond your project cap if billing data hasn't processed before more charges are accrued.
### Billing account tier spend caps
Each tier has a maximum monthly spend limit:
| Usage tier | Spend cap |
| --- | --- |
| Free | N/A |
| Tier 1 | $250 |
| Tier 2 | $2,000 |
| Tier 3 | $20,000 - $100,000 |
Monthly usage caps are enforced for the Gemini API at the billing account level. While default limits are preset, you can request an increase to accommodate higher usage. Total spend is aggregated across all linked projects that have the Gemini API service enabled. After the cumulative account total reaches the tier limit, service is paused for all projects linked to that billing account until the start of the next billing cycle (the 1st of each month).
#### Evaluate your billing account spend
To evaluate your historical monthly spending to determine if the new Billing Account tier spend caps will impact your ongoing projects, follow these steps:
1. In the Google Cloud console, view your Cloud Billing account Reports page. If you have more than one billing account, at the prompt, choose the Cloud Billing account for which you'd like to view cost reports.
2. The report defaults to "Group by Service" in the "Current month". You will see Gemini API in the Service column and total spend in the Usage cost column of the table.
3. To see granular costs limited to Gemini API usage, set the Group by filter to group by SKU , and the Services filter to Gemini API .
4. Adjust the Time range by usage date filter to your desired range to evaluate your historical spend in a period.
## Processing times
Billing signals and updates don't always happen in real time.
- Credit usage : Usage costs are typically drawn down from your balance within minutes.
- Payment confirmation : While most card payments are instant, some forms of payment (like bank transfers) may take several days to clear. Services only resume or upgrade after the purchase of credits is officially confirmed.
- Tier upgrades : After a successful payment, or when you meet the upgrade criteria , tier upgrades usually reflect within 10 minutes.
- Total Cost breakdown graphs : The graphs showing your total cost breakdown on both the Billing page and the Spend page can take up to 24 hours to update.
Read the Cloud Billing guides on charging cycle and transaction latencies to learn more about potential billing delays.
## Refunds
Refunds aren't allowed for Prepay billing accounts, except when switching account types.
When a Prepay account switches to the Postpay account type (after you meet the criteria and manually upgrade your account), the Prepay account is closed and any remaining prepaid credits are automatically refunded to the payment method on file.
If you close your Prepay account for any reason other than upgrading to Postpay, any remaining prepaid credits are forfeited.
Purchased credits expire after 1 year. After expiration, credits are forfeited and can't be retrieved.
Postpay accounts follow the Google Cloud refund policy .
## Cloud Billing accounts
The Gemini API uses Cloud Billing accounts for billing services, which you can set up directly in AI Studio . You can use AI Studio to track spending, understand costs, and make payments.
Tiers, rate limits, and billing account caps are all determined at the billing account level.
### Projects and API keys
All projects linked to a Cloud Billing account inherit the billing account's usage tier and associated rate limits and account caps. If you change a project from one billing account to another, its tier, and subsequently rate limits and account caps, will switch to the tier of the new billing account.
Cumulative spend (towards all Google Cloud products) and account age across all projects tied to a billing account counts towards that billing account's tier qualifications .
You can unlink a project from its billing account to return to the free tier.
API keys are credentials generated inside a project. They have no independent billing settings; they inherit the tier limits and billing status of the project. The cumulative usage from all keys within a project counts toward that project's spend cap and the billing account's total spend.
## Frequently asked questions
The following sections provide answers to frequently asked questions.
### What am I billed for?
Gemini API pricing is based on the following:
- Input token count
- Output token count
- Cached token count
- Cached token storage duration
For pricing information, see the Pricing page .
### Where can I view my quota?
You can view your quota and system limits in AI Studio .
### How do I move to a higher rate limit tier, or request more quota?
You will automatically be granted more quota when your account reaches the next tier requirements .
### Can I use the Gemini API for free in EEA (including EU), the UK, and CH?
Yes, we make the free tier and paid tier available in many regions .
### If I set up billing with the Gemini API, will I be charged for my Google AI Studio usage?
AI Studio usage remains free of charge unless users link a paid API key for access to paid features. Once you link a paid API key as part of a paid project in AI Studio, you will be charged for AI Studio usage for that key. You can switch between Paid Tier projects and Free Tier projects as needed by using the respective API keys linked to each type.
### If I'm on the Free Tier, how do I upgrade to higher tiers?
To access higher tiers, you must set up billing on your project. Click Set up billing in Google AI Studio. This will walk you through selecting or creating a Cloud Billing account. If you are required to be on the prepaid billing model, the Set up billing process will guide you through the process to create your Prepay account that is linked to your Cloud Billing account.
### Can I use 1M tokens in the free tier?
The free tier for Gemini API differs based on the model selected. For now, you can try the 1M token context window in the following ways:
- In Google AI Studio
- With free-of-charge plans for select models
- With postpaid plans
### Can I revert back to Free Tier after I've upgraded to higher (paid) tiers?
To downgrade to the Free Tier, you can disable billing on each of your projects that you want to downgrade.
### How can I calculate the number of tokens I'm using?
Use the GenerativeModel.count_tokens method to count the number of tokens. Refer to the Tokens guide to learn more about tokens.
### If I sign up for my first Cloud Billing account through AI Studio, will I still get a Google Cloud Free Trial?
When you sign up for your first ever Cloud Billing account, your Google Cloud Free Trial starts and you are granted a $300 Welcome credit . However, those credits can't be used to pay for AI Studio usage. You can use the Welcome credit to pay for other eligible services within Google Cloud (note that once those credits are consumed or expire (within 90 days), any additional usage costs are automatically billed to your established form of payment).
### Can I use my Google Cloud Welcome credit with the Gemini API?
No, the Google Cloud Welcome credit or free trial credit can't be used towards the Gemini API or AI Studio.
If you were granted a Google Cloud welcome credit before they became ineligible, you are allowed to spend your remaining credits on the Gemini API and AI Studio up until the credits expire (after 90 days).
### Does the Google Cloud Free Trial apply to Gemini API usage?
No, starting March 2026, Gemini API usage costs are specifically excluded from the $300 Google Cloud Free Trial program.
### How is billing handled?
Billing for the Gemini API is handled by the Cloud billing system. Learn about the in-product Cloud Billing setup in the Cloud Billing documentation .
### Am I charged for failed requests?
If your request fails with a 400 or 500 error, you won't be charged for the tokens used. However, the request will still count against your quota.
### Is GetTokens billed?
Requests to the GetTokens API are not billed, and they don't count against inference quota.
### How is my Google AI Studio data handled if I have a paid API account?
Refer to the Terms of service for details on how data is handled when Cloud billing is enabled (see "How Google Uses Your Data" under "Paid Services"). Note that your Google AI Studio prompts are treated under the same "Paid Services" terms so long as at least 1 API project has billing enabled, which you can validate on the Gemini API key page if you see any projects marked as "Paid" under "Plan".
### What is prepaid billing and who is required to use the prepaid billing model?
Prepaid billing allows users of Gemini API in AI Studio to pre-purchase credits. Starting Mar 23, 2026, new users to AI Studio might be required to be on the Prepaid billing plan. During the AI Studio Set up Billing process, the UI will guide you through the billing set up flow and will indicate if you are required to prepay.
### How do I purchase prepay credits, and is there a minimum amount or maximum?
You can purchase credits on the AI Studio Billing page. During the purchase process, the UI will provide the minimum pre-purchase amount that is required for your region and tier level, as well as a maximum amount that can be in your account at one time.
### Can I configure my Prepay account to automatically purchase more credits as needed?
Yes, we recommend that you configure auto-reload in the AI Studio Billing settings. You specify a "trigger" credit balance (e.g., "when my balance falls below $30") and a "reload value" (e.g., "add $100").
### Can I get a refund for my unused credits?
All prepaid API credits expire after 1 year and cannot be refunded. Read the refund policy for Prepay accounts .
### Do my prepaid credits expire?
Yes, credits expire 12 months after their purchase date.
### What happens when my prepaid credit balance hits $0?
All Gemini API services in all projects paid for by that Cloud Billing Prepay account will stop immediately to prevent incurring more charges. Your projects aren't automatically downgraded to the Free Tier.
To restore service at your current Paid Tier level, you must purchase additional credits . After you've purchased credits, you should be able to use the Gemini API. Note that there might be a delay while our systems update to reflect your credit balance.
Optionally, to downgrade to the Free Tier, you can disable billing on the projects you want to downgrade.
### Why did my usage stop even though my Prepay credit balance is greater than $0?
You may have hit the usage limit for your current tier. Usage limits will increase automatically as you progress to higher tiers. Your Gemini API AI Studio usage can also be impacted due to the status of your Cloud Billing account .
### Why is my Prepay account credit balance negative?
Due to the complexity of our billing and processing systems, there might be delays in our ability to cut off usage after you consume all of your credits. This excess usage might appear as a negative credit balance in your AI Studio billing dashboard. If this happens, your service is paused, and your negative balance will be deducted from your next credit purchase.
To avoid a pause in your Gemini API service, we recommend setting up auto-reload to automatically purchase more credits when your credit balance falls below a value you specify.
### Can I use my Prepay credits for other Google Cloud services, like Gemini Enterprise Agent Platform?
No, Prepay credits are strictly locked to Gemini API usage. Any other Google Cloud services you use (Compute, Storage, Gemini Enterprise Agent Platform) are billed using the standard Cloud charging cycle .
### Can I switch to a Postpay billing plan?
When you establish a payment history and reach a tier eligible for the Postpay billing plan, you can optionally choose to transition all your future Gemini API usage costs to a standard, consolidated Google Cloud Postpay charging cycle .
### What happens to my prepaid credits if I switch to Postpay?
When you upgrade to Postpay , Cloud Billing closes your Prepay payments account, turns off auto-reload , and automatically refunds any unused Prepay credits to you (subject to standard refund processing time).
### Where can I see my current Prepay credit balance and transaction history?
All balance management and transaction history for the Gemini API must be done directly within the Google AI Studio Billing tab.
### Why am I seeing "The billing account type is inactive or unsupported"?
Payments interactions on the AI Studio Billing page may be blocked and replaced with the message "The billing account type is inactive or unsupported" if your selected billing account type or billing account status is not eligible for the Paid Tier in AI Studio.
Check the Cloud Console to see your billing account's status. One ineligible type could be Free trial account , in which case you can activate billing in AI Studio to become eligible. One inactive state could be Closed , in which case you can reopen the account .
### Will my Gemini API usage costs show up in the Google Cloud console?
Yes, Gemini API costs, alongside costs associated with any other Google Cloud services that are paid for by your Cloud Billing account, are viewable on the Cost management pages in the Cloud Billing console . Note that you can only manage your Prepay credit balance in AI Studio.
### Why isn't my Gemini API Usage showing up in the Cloud Billing Console, when I can see it in AI Studio Billing, along with the consumption of my credits?
Google Cloud and AI Studio report usage data to Cloud Billing at varying intervals. Due to the complexity of our billing and processing systems, you might see a delay between your use of services, and the usage and costs being available to view in Cloud Billing. Typically, your cost details are available within a day, but can sometimes take more than 24 hours. Learn more about delayed billing in the Cloud Billing documentation .
### If I use other Google Cloud services with costs that are subject to a Postpay charging cycle, what happens if I miss a payment?
Missing a payment for other Google Cloud services can suspend your Gemini API access in AI Studio, regardless of how many prepaid credits you have available . AI Studio usage is powered by a Google Cloud Billing account, which can share both Prepay billing for AI Studio and Postpay billing for other Cloud services. An issue with your Postpay balance halts all services tied to that account. Your Gemini API usage will be suspended if your Cloud Billing account is flagged for issues such as:
- A delinquent or overdue balance
- A declined payment
- An invalid or expired payment method
To restore service, you must resolve the Postpay account issue in the Google Cloud Billing console. Once you resolve the issue, you will regain access to your Prepaid Gemini API credits and services.
### Where can I get help with billing?
To get help with billing, see Get Cloud billing support .