// Fake https://github.com/actions/github-script objects to satisfy WebStorm code checks
const context = {
    payload: {
        number: 0,
        pull_request: {
            base: {
                ref: "ref"
            }
        }
    }
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

    async function dismissReviews(message) {
        // https://octokit.github.io/rest.js/v18#pulls-list-reviews
        let review_ids = await github.rest.pulls.listReviews({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: context.payload.number
        }).then(rsp => {
            return rsp.data;
        }).then(reviews => {
            // Dismissing already dismissed review will result in API error. Possible
            // states are APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED, PENDING.
            return reviews.filter(r => r.state === "APPROVED").map(r => r.id);
        });

        if (review_ids.length) {
            console.log(`Dismissing reviews ${review_ids}`);

            await Promise.all(review_ids.map(async (review_id) => {
                await github.rest.pulls.dismissReview({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    pull_number: context.payload.number,
                    review_id: review_id,
                    message,
                });
            }));
            // github.rest.pulls.requestReviewers could be used here to automatically
            // re-request the reviews, but this is out of scope of this script.
        } else {
            console.log("No reviews to dismiss");
        }
        return message;
    }

    // Get patch of the previous state (before push) and the current
    // state (after push) of the PR, compared to the base branch.
    // https://octokit.github.io/rest.js/v18#repos-compare-commits
    const commonRequestParams = {
        owner: context.repo.owner,
        repo: context.repo.repo,
        base: context.payload.pull_request.base.ref,
        // head: needs to be added
        mediaType: {
            format: "application/vnd.github.v3.patch"
        }
    };
    let patches = await Promise.all([
        github.rest.repos.compareCommits({...commonRequestParams, head: context.payload.before}),
        github.rest.repos.compareCommits({...commonRequestParams, head: context.payload.after})
    ]).then(responses => {
        return responses.map(rsp => rsp.data);
    }).catch(err => {
        console.error(err);
        return null;
    });

    if (!patches) {
        // Always fallback to default always-dismiss behaviour on errors
        return await dismissReviews("Dismissed reviews because pull-request patch files could not be checked");
    }

    // Remove commit hashes from the patch files, which are the only thing changed if
    // this is really only a pure rebase and nothing included in this PR is changed
    patches = patches
        .map(p => p.replace(
            // A brief metadata header that begins with "From <commit> Mon Sep 17 00:00:00 2001"
            /^From [\da-f]{40} Mon Sep 17 00:00:00 2001$/gm, "### REMOVED COMMIT METADATA HEADER ####"
        ))
        .map(p => p.replace(
            /^index [\da-f]{7}\.\.[\da-f]{7}(?: \d{6})?$/gm, "### REMOVED FILE INDEX HEADER ###"
        ));

    if (patches[0] === patches[1]) {
        return `Keeping the reviews because the latest push was only a rebase on ${context.payload.pull_request.base.ref}`
    }

    console.log(
        "########## BEFORE ##########\n" +
        patches[0] +
        "\n############################\n" +
        "########## AFTER ###########\n" +
        patches[1] +
        "\n############################\n"
    )
    return await dismissReviews("Dismissed reviews because pull-request content was changed");

    /* ############ Copy code to until here to pr-push-rebase-check.yml step check-if-pure-rebase ############ */
}
