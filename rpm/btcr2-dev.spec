Name:           btcr2-dev
Version:        1.0.1
Release:        1%{?dist}
Summary:        Static website

License:        MIT
URL:            https://btcr2.dev
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  nodejs >= 22
BuildRequires:  npm >= 10
Requires:       nginx
BuildArch:      noarch

%description
DCD's static website built with the 'vitepress' framework.
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
cp -r docs/.vitepress/dist/* %{buildroot}/var/www/%{name}/


%files
%defattr(-,root,root,-)
/var/www/%{name}

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
* Tue Oct 7 2025 Dan Pape <dpape@dpape.com>
- Initial release.

