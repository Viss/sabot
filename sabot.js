// this is a cobbled together js file that i took from another repo
// which was a js tool to nuke tweets, but i pushed it through gpt 4o canvas 
// several dozen times until it actually did what i wanted, didnt scroll errors
// and actually deleted stuff. you'll need to replace the two top variables with
// the actual values for your account, and then go into the inspector, go to 
// 'console' on the left, and paste this whole file into the console, then hit enter.
// it should start nuking stuff. its not the fastest thing in the world, but it works!

(function() {
    const authorization = "Bearer <insert your actual bearer token here>";
    const username = "<insert your twitter handle here>";

    function getCookie(name) {
        let value = "; " + document.cookie;
        let parts = value.split("; " + name + "=");
        if (parts.length === 2) {
            return parts.pop().split(";").shift();
        }
    }

    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function deleteTweet(tweetId, isRetweet = false, sourceTweetId = null) {
        try {
            let url, body;
            if (isRetweet) {
                // Using the correct DeleteRetweet API endpoint
                url = 'https://x.com/i/api/graphql/iQtK4dl5hBmXewYZuEOKVw/DeleteRetweet';
                body = {
                    queryId: "iQtK4dl5hBmXewYZuEOKVw",
                    variables: {
                        tweet_id: tweetId,
                        source_tweet_id: sourceTweetId // Adding source tweet ID for retweets
                    }
                };
            } else {
                url = 'https://x.com/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet';
                body = {
                    queryId: "VaenaVgh5q5ih7kvyVjgtg",
                    variables: {
                        tweet_id: tweetId,
                        dark_request: false
                    }
                };
            }

            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': authorization,
                    'x-csrf-token': csrf_token,
                    'x-twitter-client-language': language_code,
                    'x-twitter-active-user': 'yes',
                    'User-Agent': ua,
                    'content-type': 'application/json',
                    'accept': '*/*',
                    'origin': 'https://x.com',
                    'referer': 'https://x.com/'
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            if (response.ok) {
                console.log("Tweet successfully deleted:", tweetId);
            } else {
                const responseBody = await response.text();
                console.error("Failed to delete tweet:", tweetId, response.status, response.statusText, responseBody);
            }
        } catch (error) {
            console.error("Error deleting tweet:", tweetId, error);
        }
    }

    async function processAllTweets() {
        try {
            let hasMoreTweets = true;
            while (hasMoreTweets) {
                console.log("Collecting tweets to delete...");
                var tweets_to_delete = [];

                // Collect visible tweets
                var selectors = [
                    'article[data-testid="tweet"]',
                    'div[data-testid="tweet"]',
                    'article[role="article"]'
                ];
                let matchedElements = [];
                for (let selector of selectors) {
                    let elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        matchedElements.push(...elements);
                    }
                }

                if (matchedElements.length > 0) {
                    console.log(`Found ${matchedElements.length} potential tweets.`);
                    matchedElements.forEach(tweetElement => {
                        let tweetLink = tweetElement.querySelector('a[href*="/status/"]');
                        if (tweetLink) {
                            let tweetUrl = tweetLink.getAttribute('href');
                            let tweetId = tweetUrl.split("/status/")[1].split("/")[0].trim();
                            if (tweetId.match(/^\d+$/)) {
                                let isRetweet = tweetElement.querySelector('[data-testid="unretweet"]') !== null;
                                let sourceTweetId = null;

                                // If this is a retweet, find the source tweet ID
                                if (isRetweet) {
                                    let sourceTweetLink = tweetElement.querySelector('a[href*="/status/"]');
                                    if (sourceTweetLink) {
                                        let sourceTweetUrl = sourceTweetLink.getAttribute('href');
                                        sourceTweetId = sourceTweetUrl.split("/status/")[1].split("/")[0].trim();
                                    }
                                }

                                tweets_to_delete.push({ tweetId, isRetweet, sourceTweetId });
                            }
                        }
                    });
                } else {
                    console.warn("No matching tweet elements found with any of the selectors.");
                }

                if (tweets_to_delete.length === 0) {
                    console.warn("No tweets found to delete. Exiting.");
                    hasMoreTweets = false;
                    return;
                }

                console.log(`Found ${tweets_to_delete.length} tweets to delete. Starting deletion...`);

                // Delete tweets one by one
                for (let { tweetId, isRetweet, sourceTweetId } of tweets_to_delete) {
                    await deleteTweet(tweetId, isRetweet, sourceTweetId);
                    await sleep(200); // Shortened wait between deletions for faster performance
                }

                // Scroll to load more tweets
                window.scrollTo(0, document.body.scrollHeight);
                await sleep(1000); // Shortened wait for more tweets to load
            }

            console.log("All tweets have been processed.");

        } catch (e) {
            console.error("An unexpected error occurred:", e);
        }
    }

    // Start the script
    try {
        console.log("Starting tweet deletion script...");

        var ua;
        if (navigator.userAgentData) {
            ua = navigator.userAgentData.brands.map(brand => `"${brand.brand}";v="${brand.version}"`).join(', ');
        } else {
            ua = navigator.userAgent;
        }
        console.log("User agent detected:", ua);

        var csrf_token = getCookie("ct0");
        if (!csrf_token) {
            console.error("CSRF token not found. Exiting script.");
            return;
        }
        console.log("CSRF token found:", csrf_token);

        var language_code = navigator.language.split("-")[0];
        console.log("Language code:", language_code);

        // Start processing all tweets
        processAllTweets();

    } catch (e) {
        console.error("An unexpected error occurred:", e);
    }
})();

