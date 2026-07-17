Name:           btcr2-dev
Version:        2.0.0
Release:        1%{?dist}
Summary:        Static website

License:        MPL-2.0
URL:            https://btcr2.dev
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  nodejs >= 22
BuildRequires:  npm >= 10
Requires:       nginx
BuildArch:      noarch

%description
DCD's static website built with the Astro 'starlight' framework.
This package includes the built static files and nginx configuration.

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
* Fri Jul 17 2026 jintekc <github@jintek.consulting> - 2.0.0-1
- Migrate the site to Astro Starlight (build output moves from
  docs/.vitepress/dist to dist).

* Fri Jul 17 2026 jintekc <github@jintek.consulting> - 1.1.0-1
- Fix Resolve demo: route mempool.space through the site's same-origin
  /mempool nginx proxy via api config (no more global fetch patching).
- Restore Diagrams page (client-side mermaid) and Update/Deactivate demos.
- Upgrade @did-btcr2 stack to api 0.17.

* Tue Oct 7 2025 Dan Pape <dpape@dpape.com>
- Initial release.

