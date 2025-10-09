# Building an RPM

Easiest way is probably something like this:

```
# If needed:
git clone git@gl1.dcdpr.com:website/btcr2-dev.git

# Make sure you are one level above the website repo
# directory, then create a tarball:
tar -zcf btcr2-dev-1.0.0.tar.gz btcr2-dev

# Build the RPM
rpmbuild -ta btcr2-dev-1.0.0.tar.gz

# Install as needed with `rpm`, `yum`, etc.

```
