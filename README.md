# Coverity Report For v7 JSON Output

![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/synopsys-sig/coverity-report-output-v7-json?color=blue&label=Latest%20Version&sort=semver)

Uses Coverity's v7 JSON output to provide comments on Pull Requests about code quality issues. 

**Note**: This action does not run Coverity command line tools. It is purely a way to expose Coverity output within GitHub.

# Quick Start Guide
To start using this action, add the following step to your existing GitHub workflow. 

```yaml
  - name: Parse Coverity JSON
    uses: synopsys-sig/coverity-report-output-v7-json@<version>
    with:
        json-file-path: $COVERITY_OUTPUT_PATH
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

Replace `<version>` with the version of the action you would like to use. 
Set the parameter `json-file-path` to the path where the Coverity v7 JSON output can be found. This is the file generated using the following command: 
```bash
cov-format-errors --dir <intermediate dir> --json-output-v7 coverity-results.json
```

# Using The Action With Coverity
Coevrity has many deployment options, and how you use it will depend on your environment and project source code. The following provides a simple example of how Coverity could be used within a GitHub workflow in conjunction with this action. This example uses a self-hosted runner with Coverity tools pre-installed.

This workflow does the following:
1. Computes a Coverity stream and project name based on the GitHub repository and branch. By linking the GitHub repo to Coverity Connect in this way, your workflows can be generic with no project-specific data contained in them. 
2. Runs `cov-manage-im` to ensure the project and stream are configured on the Coverity server. Without this step, a project and stream must be created manually. By including this step, you can easily on-board new projects into Coverity with no manual intervention. This must be run with credenials that have permission to manage projects and streams.
3. Runs `cov-capture`, `cov-analyze` to create Coverity results. With those results, it runs `cov-format-errors` to generate the JSON file for this action to consume. This is the section that will vary the most from environment to environment. For example, your project may require a build capture instead of automatic capture. Or, you may use the Coverity CLI. You may also use cov-run-desktop, as it can generate the same JSON output.
4. Runs this action to consume the JSON file produced in the previous step. The action can optionally consult with the Coverity Connect instance to compare the results with a baseline stream and only report newly introduced issues.

```yaml
name: Coverity with Self-Hosted Runner
on:
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: [self-hosted]

    env:
      COVERITY_URL: ${{ secrets.COVERITY_URL }}
      COV_USER: ${{ secrets.COVERITY_USER }}
      COVERITY_PASSPHRASE: ${{ secrets.COVERITY_PASSPHRASE }}
      COVERITY_CHECKERS: --webapp-security

    steps:
      - uses: actions/checkout@v2

      - name: Create Coverity Stream
        # Only create a new stream for 'push' events
        if: ${{github.event_name == 'push'}}
        run: |
          env
          export COVERITY_STREAM_NAME=${GITHUB_REPOSITORY##*/}-${GITHUB_REF##*/}
          export COVERITY_PROJECT_NAME=${GITHUB_REPOSITORY##*/}
          echo Ensure that stream "$COVERITY_STREAM_NAME" exists
          cov-manage-im --url $COVERITY_URL --on-new-cert trust --mode projects --add --set name:"$COVERITY_PROJECT_NAME" || true
          cov-manage-im --url $COVERITY_URL --on-new-cert trust --mode streams --add -set name:"$COVERITY_STREAM_NAME" || true
          cov-manage-im --url $COVERITY_URL --on-new-cert trust --mode projects --update --name "$COVERITY_PROJECT_NAME" --insert stream:"$COVERITY_STREAM_NAME"

      - name: Coverity Scan for Pull Requests
        if: ${{github.event_name == 'pull_request'}}
        run: |
          export COVERITY_STREAM_NAME=${GITHUB_REPOSITORY##*/}-${GITHUB_REF##*/}
          cov-capture --dir idir --project-dir .
          cov-analyze --dir idir --strip-path `pwd` $COVERITY_CHECKERS
          cov-commit-defects --dir idir --ticker-mode none --url $COVERITY_URL --on-new-cert trust --stream $COVERITY_STREAM_NAME --scm git --description "GitHub Workflow $GITHUB_WORKFLOW for $GITHUB_REPO" --version $GITHUB_SHA
          cov-format-errors --dir idir --json-output-v7 coverity-results.json
      
        # Here is where this action is called
        - name: Coverity Report
          uses: synopsys-sig/coverity-report-output-v7-json@v0.0.1
          with:
              # The following parameters are REQUIRED
              json-file-path: ./coverity-results.json
              github-token: ${{ secrets.GITHUB_TOKEN }}
              # If the following optional parameters are specified, the results from the JSON output will be
              # compared to the baseline issues in the specified project, and only NEW issues will be reported
              # in the pull request.
              coverity-url: ${{ secrets.COVERITY_URL }}
              coverity-project-name: ${{ github.event.repository.name }}
              coverity-username: ${{ secrets.COV_USER }}
              coverity-password: ${{ secrets.COVERITY_PASSPHRASE }}
```

## Include Custom Certificates (Optional)

To include one or more root CA certificates, set `NODE_EXTRA_CA_CERTS` to the certificate file-path(s) in the environment. 
Notes: 

- The certificate(s) must be in _pem_ format. 
- This environment variable can also be used with the _Create Policy Action_.  

**Example**:   
```yaml
- name: Coverity Report
        uses: synopsys-sig/coverity-report-output-v7-json@v0.0.1
        env:
            NODE_EXTRA_CA_CERTS: ${{ secrets.LOCAL_CA_CERT_PATH }}
        with:
            . . .
```
### Troubleshooting Certificates
- Problem: An error saying the file-path to the certificate cannot be read.
  - Solution: Ensure whitespace and other special characers are properly escaped based on your runner's OS.
- Problem: An error about missing certificates in the certificate-chain or missing root certificates.
  - Solution: You may only be including the server's certificate and not the _root CA certificate_. Ensure you are using the _root CA certificate_.

# Frequently asked questions
1. Why use the Coverity JSON v7 output? In order to reach the broadest set of use cases, we chose to implement this action using the slightly older Coverity JSON v7 output format. While cov-format-errors supports a JSON v8 format, cov-run-desktop only supports JSON v7, and we want to support as many deployment styles as possible. We do not query for defects from Coverity Connect in order to support use cases where the analysis is only run locally.


# Future Enhancements
1. Prevent a merge if security issues are found during the pull request. Create a GitHub status check and report the policy as failed if new security issues are found. 
2. Create GitHub Issues to track issues found by a full analysis. This action is currently focused on providing feedback on a pull request. No action is taken if run manually or on a push. A future enhancement is to create GitHub issues to track security weaknesses found during a push.
3. Allow developers to dismiss issues from the pull request. If an issue is deemed to be a false positive, a future enhancement could allow the developer to indicate this by replying to the comment, which would in turn report the status to the Coverity Connect instance so that future runs will recognize the issue as having beemn triaged as such.
