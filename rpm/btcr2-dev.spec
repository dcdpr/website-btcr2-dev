Name:           btcr2-dev
Version:        2.2.0
Release:        1%{?dist}
Summary:        Static website

License:        MPL-2.0
URL:            https://btcr2.dev
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  nodejs >= 22.12
BuildRequires:  npm >= 10
Requires:       nginx
BuildArch:      noarch

%description
DCD's static website built with the Astro 'starlight' framework.
This package includes the built static files. It does not include the
nginx configuration.

%prep
%setup -q -n %{name}

%build
npm install
npm run build

%install
# create dirs
mkdir -p %{buildroot}/var/www/%{name}

# install static files
cp -r dist/* %{buildroot}/var/www/%{name}/

%files
%defattr(-,root,root,-)
/var/www/%{name}

%clean
rm -rf %{buildroot}

%pre

%post
# Restart nginx after installation
/usr/bin/systemctl daemon-reload >/dev/null 2>&1 || :
/usr/bin/systemctl restart nginx.service >/dev/null 2>&1 || :

%preun

%postun
# Restart nginx after upgrade or removal
/usr/bin/systemctl daemon-reload >/dev/null 2>&1 || :
if [ $1 -ge 1 ]; then
    /usr/bin/systemctl restart nginx.service >/dev/null 2>&1 || :
fi

%changelog
* Fri Sep 25 2026 jintekc <github@jintek.consulting> - 2.2.0-1
- Align the diagrams with the current did:btcr2 specification terms and
  algorithms. Split the Diagrams page into six pages and add new diagrams.
- Rework the Stuart-meets-Satoshi use case diagrams and rename them.
  Add architecture, first contact, and data flow diagrams.
- Simplify the use case diagrams and show them on four pages under
  Diagrams (/diagrams/use-case/).
- Show a k-of-n fallback next to the n-of-n signatures of Aggregate
  Beacons, with the risk of each choice.
- Demo: align the buttons and the form fields. The code preview and the
  JSON output do not wrap lines.

* Thu Sep 24 2026 jintekc <github@jintek.consulting> - 2.1.0-1
- Move the demos and the TypeScript docs to @did-btcr2/api 0.27.
- The demos call the Bitcoin REST hosts directly. The site needs no
  /mempool proxy.

* Mon Sep 07 2026 jintekc <github@jintek.consulting> - 2.0.0-1
- Migrate the site to Astro Starlight (build output moves from
  docs/.vitepress/dist to dist).
- Require Node.js 22.12 or newer to build.

* Mon Jul 20 2026 jintekc <github@jintek.consulting> - 1.1.1-1
- Fix the external (x1) create/resolve demo flow: build genesis documents
  with GenesisDocument.fromPublicKey (placeholder ids plus the required
  beacon service), resolve via the sidecar genesisDocument key, and show
  underlying error causes in all demos.

* Fri Jul 17 2026 jintekc <github@jintek.consulting> - 1.1.0-1
- Fix Resolve demo: route mempool.space through the site's same-origin
  /mempool nginx proxy via api config (no more global fetch patching).
- Restore Diagrams page (client-side mermaid) and Update/Deactivate demos.
- Upgrade @did-btcr2 stack to api 0.17.

* Tue Oct 7 2025 Dan Pape <dpape@dpape.com>
- Initial release.

