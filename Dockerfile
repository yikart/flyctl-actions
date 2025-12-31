FROM alpine

RUN apk add --no-cache curl tar

# Install flyctl from forked repository
# Get latest release version and download the binary
RUN LATEST_VERSION=$(curl -s https://api.github.com/repos/yikart/flyctl/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/') && \
    curl -L "https://github.com/yikart/flyctl/releases/download/v${LATEST_VERSION}/flyctl_${LATEST_VERSION}_Linux_x86_64.tar.gz" -o flyctl.tar.gz && \
    tar -xzf flyctl.tar.gz -C /usr/local/bin && \
    rm flyctl.tar.gz && \
    chmod +x /usr/local/bin/flyctl

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
