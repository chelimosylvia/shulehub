#!/usr/bin/env bash

# Install correct Python version
pyenv install 3.11.9 -s
pyenv global 3.11.9

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt
