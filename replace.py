import os
import sys
import re

SUPPORT = ['.js', '.jsx', '.html', '.htm']

with open('replace.txt', 'r') as ff:
  words = ff.readlines()

words = [line.replace('\n', '').split(' ') for line in words]

def parseFolder(folder, word):
  for root, dirs, files in os.walk(folder):
    if files:
      for f in files:
        for ext in SUPPORT:
          if f.endswith(ext):
            with open(os.path.join(root, f), 'r') as ff:
              source = ff.read()
            result = re.sub(r'\b%s\b' % word[0] , word[1], source)
            with open(os.path.join(root, f), 'w') as ff:
              ff.write(result)

for word in words:
  print word[0]
  parseFolder('test', word)
  parseFolder('app', word)
