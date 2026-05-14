FROM texlive/texlive:latest

# Install PowerShell and font support
RUN apt-get update && apt-get install -y \
    fontconfig \
    wget \
    apt-transport-https \
    && wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update && apt-get install -y powershell \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create user fonts directory for custom fonts (e.g. Inter Variable)
RUN mkdir -p /usr/local/share/fonts/custom

# Copy any fonts the user dropped into the fonts/ folder
COPY fonts/ /usr/local/share/fonts/custom/

# Rebuild font cache so xelatex/lualatex can find them
RUN fc-cache -fv
