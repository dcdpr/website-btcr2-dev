---
title: Python
---

The Python implementation lives at
[`dcdpr/did-btcr2-py`](https://github.com/dcdpr/did-btcr2-py).

> **Status** — Experimental alpha. It implements the earlier did:btc1 draft of the
> specification, not the current did:btcr2 specification. The last commit is from
> 2025-07-30. No PyPI package yet — install from source.

## Install

```sh
pip install libbtc1@git+https://github.com/dcdpr/did-btcr2-py
```

From source:

```sh
git clone https://github.com/dcdpr/did-btcr2-py.git
cd did-btcr2-py
python -m venv venv
source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

## Create

```py
# TODO — pending stable Python API.
# See https://github.com/dcdpr/did-btcr2-py for the in-development surface.
```

## Resolve

```py
# TODO
```

## Update

```py
# TODO
```

## Deactivate

```py
# TODO
```

## Contributing

Fork <https://github.com/dcdpr/did-btcr2-py>, create a virtualenv, run the
test suite (`python -m unittest`), submit a PR.
