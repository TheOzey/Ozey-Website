#!/usr/bin/env python3
"""Summarises a page's navigation from its server-rendered HTML (read from stdin).

Prints one line:
  product=<active product tab>;group=<active group tab>;back=<label@href>;crumbs=<crumbs>
`back` is the main header's back button (empty when there is none).
where each crumb is `label@href` for a link, or `label!` for the current page
(not a link, aria-current="page"). Anything else is reported as `label?`.
"""
import sys
from html.parser import HTMLParser


class Nav(HTMLParser):
    def __init__(self):
        super().__init__()
        self.navs = []  # stack of open <nav aria-label> labels
        self.active = {}  # nav label -> active tab text
        self.crumbs = []
        self.capture = None  # ("tab", nav) or ("crumb", index)
        self.back = ["", ""]

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "nav":
            self.navs.append(a.get("aria-label", ""))
        cls = a.get("class", "") or ""
        if tag == "a" and a.get("data-nav") == "back":
            self.back[1] = a.get("href", "")
            self.capture = ("back", None)
            return
        if "breadcrumbs__link" in cls.split():
            href = a.get("href")
            kind = "@" + href if tag == "a" and href else ("!" if a.get("aria-current") == "page" and tag != "a" else "?")
            self.crumbs.append(["", kind])
            self.capture = ("crumb", len(self.crumbs) - 1)
        elif tag == "a" and a.get("aria-current") == "page" and self.navs:
            self.capture = ("tab", self.navs[-1])
            self.active[self.navs[-1]] = ""

    def handle_endtag(self, tag):
        if tag == "nav" and self.navs:
            self.navs.pop()
        if tag in ("a", "span") and self.capture:
            self.capture = None

    def handle_data(self, data):
        if not self.capture:
            return
        kind, key = self.capture
        if kind == "back":
            self.back[0] += data
        elif kind == "crumb":
            self.crumbs[key][0] += data
        else:
            self.active[key] += data


p = Nav()
p.feed(sys.stdin.read())
crumbs = ",".join(f"{label.strip()}{kind}" for label, kind in p.crumbs)
back = f"{p.back[0].strip()}@{p.back[1]}" if p.back[1] else ""
print(f"product={p.active.get('SHG sections', '')};group={p.active.get('Group sections', '')};back={back};crumbs={crumbs}")
