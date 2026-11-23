#!/usr/bin/env python3
"""
ferramentas/versionar.py

Coloca ?v=<versão> em todos os scripts e no CSS do index.html (e grava window.LUIGGI_VERSAO), pra que,
depois de cada atualização no site, o navegador baixe todos os arquivos novos juntos — sem misturar
arquivos novos com antigos do cache (o que pode deixar a tela 3D em branco).

Uso: python ferramentas/versionar.py [versão]   (sem versão: data e hora atuais)
Rode antes de cada publicação.
"""
import os, re, sys, datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
versao = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime('%Y%m%d%H%M')
p = os.path.join(RAIZ, 'index.html')
s = open(p, encoding='utf-8', newline='').read()


def com_versao(m):
    attr, url = m.group(1), m.group(2)
    if url.startswith(('http:', 'https:', '//', 'data:')):
        return m.group(0)
    base = url.split('?')[0]
    return f'{attr}="{base}?v={versao}"'


s = re.sub(r'(src|href)="((?:src|data|vendor)/[^"]+\.(?:js|css))"', com_versao, s)
marca = '<script>window.LUIGGI_VERSAO = '
if marca in s:
    s = re.sub(r"<script>window\.LUIGGI_VERSAO = '[^']*';</script>", f"<script>window.LUIGGI_VERSAO = '{versao}';</script>", s)
else:
    s = s.replace('<link rel="stylesheet"', f"<script>window.LUIGGI_VERSAO = '{versao}';</script>\n  <link rel=\"stylesheet\"", 1)
open(p, 'w', encoding='utf-8', newline='').write(s)
print('versão', versao)
