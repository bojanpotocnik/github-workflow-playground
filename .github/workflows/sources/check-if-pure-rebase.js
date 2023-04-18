// Fake https://github.com/actions/github-script objects to satisfy WebStorm code checks
const context = {
    payload: {
        number: 0,
        pull_request: {
            base: {
                ref: "ref",
                repo: {
                    compare_url: "https://api.github.com/repos/:owner/:repo/compare/{base}...{head}"
                }
            }
        }
    },
    apiUrl: "https://api.github.com",
    serverUrl: "https://github.com"
};
const github = {
    rest: {
        pulls: {
            listReviews: function (args) {
                console.log("github.rest.pulls.listReviews(args)", args);
                return {};
            },
            dismissReview: function (args) {
                console.log("github.rest.pulls.dismissReview(args)", args);
            }
        },
        repos: {
            compareCommits: function (args) {
                console.log("github.rest.repos.compareCommits(args)", args);
                return "patch";
            }
        }
    },
};

// Unused function to satisfy WebStorm code checks
async function put_this_under_script_with_in_yml() {
    /* ############ Copy from here down to pr-push-rebase-check.yml step check-if-pure-rebase ############ */

    const compare_url = context.payload.pull_request.base.repo.compare_url
        .replace(`${context.apiUrl}/repos`, context.serverUrl)
        .replace("{base}", context.payload.pull_request.base.ref);
    console.info("Use these URLs for manual investigation (append '.patch' to download raw patch files):" +
        "\n    Before: " + compare_url.replace("{head}", context.payload.before) +
        "\n    After:  " + compare_url.replace("{head}", context.payload.after));

    const commonOctokitParams = {owner: context.repo.owner, repo: context.repo.repo};
    const commonPullParams = {...commonOctokitParams, pull_number: context.payload.number};

    // https://octokit.github.io/rest.js/v18#pulls-list-reviews
    const review_ids = await github.rest.pulls.listReviews(commonPullParams).then(rsp => {
        return rsp.data;
    }).then(reviews => {
        // Dismissing already dismissed review will result in API error. Possible
        // states are APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED, PENDING.
        return reviews.filter(r => r.state === "APPROVED").map(r => r.id);
    });

    async function dismissReviews(message) {
        console.log(`Dismissing reviews ${review_ids}`);
        await Promise.all(review_ids.map(async (review_id) => {
            console.debug(`Dismissing review ${review_id}`);
            await github.rest.pulls.dismissReview({...commonPullParams, review_id: review_id, message});
        }));
        // github.rest.pulls.requestReviewers could be used here to automatically
        // re-request the reviews, but this is out of scope of this script.
        return message;
    }

    // Get patch of the previous state (before push) and the current
    // state (after push) of the PR, compared to the base branch.
    // https://octokit.github.io/rest.js/v18#repos-compare-commits
    const commonCompareParams = {
        ...commonOctokitParams,
        base: context.payload.pull_request.base.ref,
        // head: needs to be added
        mediaType: {
            format: "application/vnd.github.v3.patch"
        }
    };
    let api_error = "";
    let patches = await Promise.all([
        github.rest.repos.compareCommits({...commonCompareParams, head: `${context.payload.before}a`}),
        github.rest.repos.compareCommits({...commonCompareParams, head: context.payload.after})
    ]).then(responses => {
        return responses.map(rsp => rsp.data);
    }).catch(err => {
        api_error = ` (_${err.message}_)`
        return null;
    });

    console.warn(`patches=${patches}`);
    console.log(`patches=${patches}`);
    console.warn(patches);

    if (!patches) {
        // Always fallback to default always-dismiss behaviour on errors
        return await dismissReviews(
            "Dismissed reviews because pull-request patch files could not be checked" + api_error
        );
    }

    console.log(`Patch length: before = ${patches[0].length}, after = ${patches[1].length}`);

    // Remove commit hashes from the patch files, which are the only thing changed if
    // this is really only a pure rebase and nothing included in this PR is changed
    patches = patches
        .map(p => p.replace(
            // A brief metadata header that begins with "From <commit> Mon Sep 17 00:00:00 2001"
            /^From [\da-f]{40} Mon Sep 17 00:00:00 2001$/gm, "### REMOVED COMMIT METADATA HEADER ###"
        ))
        .map(p => p.replace(
            /^index [\da-f]{7}\.\.[\da-f]{7}(?: \d{6})?$/gm, "### REMOVED FILE INDEX HEADER ###"
        ))
        .map(p => p.replace(
            // Ignore (only) range information from change hunk header "@@ -l,s +l,s @@ optional section heading"
            /^@@ -\d+,\d+ \+\d+,\d+ @@/gm, "@@ REMOVED RANGE INFO @@"
        ));

    if (patches[0] === patches[1]) {
        return `Keeping the reviews because the latest push was only a rebase on ${context.payload.pull_request.base.ref}`
    }

    return await dismissReviews("Dismissed reviews because pull-request content was changed");

    /* ############ Copy code to until here to pr-push-rebase-check.yml step check-if-pure-rebase ############ */
}
