#!/usr/bin/env python3
"""Fetch one AIHOT daily report and save it as a Hexo post."""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


API_BASE = "https://aihot.news/api/v1"
POSTS_DIR = Path(__file__).resolve().parents[1] / "source" / "_posts"
BEIJING = timezone(timedelta(hours=8))
USER_AGENT = "m-finder-hexo-daily-sync/1.0"


def request_json(path):
    request = urllib.request.Request(
        API_BASE + path,
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_report(date_value):
    target_date = date_value or datetime.now(BEIJING).date().isoformat()
    try:
        return request_json("/dailies/%s" % target_date)["report"]
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise

    index = request_json("/dailies?limit=7")
    entries = index.get("dailies") or index.get("items") or []
    dates = sorted(
        entry.get("date") or (entry.get("report") or {}).get("date")
        for entry in entries
        if entry.get("date") or (entry.get("report") or {}).get("date")
    )
    if not dates:
        raise RuntimeError("AIHOT 日报索引为空")

    latest = dates[-1]
    print("%s 日报尚未生成，改为同步最近一期 %s" % (target_date, latest))
    return request_json("/dailies/%s" % latest)["report"]


def yaml_quote(value):
    return '"%s"' % value.replace("\\", "\\\\").replace('"', '\\"')


def markdown_text(value):
    text = " ".join((value or "").split())
    for character in ("\\", "`", "*", "_", "[", "]", "<", ">"):
        text = text.replace(character, "\\" + character)
    return text


def valid_url(*candidates):
    for candidate in candidates:
        if not candidate:
            continue
        parsed = urllib.parse.urlparse(candidate)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return candidate.replace("(", "%28").replace(")", "%29")
    return ""


def add_item(lines, number, item, include_summary=True):
    title = markdown_text(item.get("title", "未命名资讯"))
    source = markdown_text((item.get("source") or {}).get("name", "AIHOT"))
    links = item.get("links") or {}
    url = valid_url(links.get("original"), links.get("aihot"))

    lines.extend(("### %d. %s" % (number, title), "", "来源：%s" % source, ""))
    if include_summary and item.get("summary"):
        lines.extend((markdown_text(item["summary"]), ""))
    if url:
        lines.extend(("[阅读原文](%s)" % url, ""))


def render_post(report):
    date_value = report["date"]
    lead = report.get("lead") or {}
    lead_title = " ".join((lead.get("title") or "").split())
    description = lead_title or ("%s 的 AI 日报" % date_value)
    title = "AI 日报 · %s" % date_value

    lines = [
        "---",
        "title: %s" % yaml_quote(title),
        "date: %s 08:00:00" % date_value,
        "tags: [AI 日报, AI, 资讯]",
        "categories: [AI 日报]",
        "description: %s" % yaml_quote(description[:100]),
        "---",
        "",
    ]

    if lead_title:
        lines.extend(("## 今日头条", "", "**%s**" % markdown_text(lead_title), ""))
        if lead.get("leadParagraph"):
            lines.extend((markdown_text(lead["leadParagraph"]), ""))

    count = 0
    for section in report.get("sections") or []:
        items = section.get("items") or []
        if not items:
            continue
        label = markdown_text(section.get("label", "AI 资讯"))
        lines.extend(("## %s" % label, ""))
        for item in items:
            count += 1
            add_item(lines, count, item)

    flashes = report.get("flashes") or []
    if flashes:
        lines.extend(("## 快讯", ""))
        for item in flashes:
            count += 1
            add_item(lines, count, item, include_summary=False)

    daily_url = valid_url((report.get("links") or {}).get("aihot"))
    if daily_url:
        lines.extend(
            (
                "---",
                "",
                "> 本文由 [AIHOT 日报](%s) 自动整理；第三方内容版权归原作者所有。" % daily_url,
                "",
            )
        )

    return "\n".join(lines)


def parse_args():
    parser = argparse.ArgumentParser(description="同步一篇 AIHOT 日报到 Hexo")
    parser.add_argument("--date", help="指定日期，格式为 YYYY-MM-DD")
    return parser.parse_args()


def main():
    args = parse_args()
    if args.date:
        try:
            datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            print("--date 必须是 YYYY-MM-DD", file=sys.stderr)
            return 2

    try:
        report = fetch_report(args.date)
    except Exception as error:
        print("同步 AIHOT 日报失败：%s" % error, file=sys.stderr)
        return 1

    has_items = any(section.get("items") for section in report.get("sections") or [])
    if not has_items and not report.get("flashes"):
        print("%s 没有资讯条目或快讯，跳过生成日报" % report["date"])
        return 0

    output = POSTS_DIR / ("ai-daily-%s.md" % report["date"])
    if output.exists():
        print("日报文章已存在，跳过：%s" % output)
        return 0

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_post(report))
    print("已生成日报文章：%s" % output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
