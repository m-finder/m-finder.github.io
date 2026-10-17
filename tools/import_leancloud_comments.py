#!/usr/bin/env python3
"""Preview and import a LeanCloud Comment JSON-streaming export into Giscus.

The default mode only reports which legacy paths can be matched to the current
Hexo site. Passing --apply is required before the script makes GitHub API
requests. Set GITHUB_TOKEN in the environment for --apply; never put a token
in the export file, command line, or repository.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen


GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
MARKER_PREFIX = "leancloud-comment:"
SHANGHAI = timezone(timedelta(hours=8))


class CommentHtmlConverter(HTMLParser):
    """Keep readable text and links while dropping legacy presentation HTML."""

    BLOCK_TAGS = {"p", "div", "br", "li", "blockquote"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.links: list[str | None] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")
        elif tag == "a":
            href = attributes.get("href")
            if href and href.startswith(("https://", "http://")):
                self.parts.append("[")
                self.links.append(href)
            else:
                self.links.append(None)
        elif tag == "img":
            alt = (attributes.get("alt") or "表情").strip()
            self.parts.append(f"[图片：{alt}]")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"p", "div", "li", "blockquote"}:
            self.parts.append("\n")
        elif tag == "a" and self.links:
            href = self.links.pop()
            if href:
                self.parts.append(f"]({href})")

    def handle_data(self, data: str) -> None:
        self.parts.append(data)

    def markdown(self) -> str:
        text = "".join(self.parts)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="LeanCloud Comment JSON-streaming export")
    parser.add_argument(
        "--site-root",
        type=Path,
        default=Path.cwd(),
        help="Hexo repository root used to match legacy paths (default: current directory)",
    )
    parser.add_argument(
        "--path-map",
        type=Path,
        help="Optional JSON object mapping legacy paths to current paths",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="Write the preview or import result JSON to this path instead of stdout",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create GitHub Discussions and comments after validation succeeds",
    )
    parser.add_argument(
        "--skip-unmatched",
        action="store_true",
        help="With --apply, skip comments whose legacy paths have no current-page match",
    )
    parser.add_argument("--repository", help="GitHub repository in OWNER/NAME form; required with --apply")
    parser.add_argument("--repository-id", help="GitHub repository node ID; required with --apply")
    parser.add_argument("--category-id", help="Giscus Discussion category node ID; required with --apply")
    return parser.parse_args()


def normalize_path(value: str) -> str:
    path = value.strip().split("#", 1)[0].split("?", 1)[0]
    if not path:
        return "/"
    return "/" + path.strip("/") + "/"


def load_export(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        header_line = handle.readline().strip()
        match = re.fullmatch(r"#filetype:JSON-streaming\s+(.+)", header_line)
        if not match:
            raise ValueError("Input is not a LeanCloud JSON-streaming export.")
        header = json.loads(match.group(1))
        if header != {"type": "Class", "class": "Comment"}:
            raise ValueError("Input must be a LeanCloud Comment class export.")

        comments: list[dict[str, Any]] = []
        for line_number, line in enumerate(handle, start=2):
            if not line.strip():
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSON on line {line_number}: {error.msg}") from error
            if not item.get("objectId") or not item.get("url"):
                raise ValueError(f"Comment on line {line_number} lacks objectId or url.")
            comments.append(item)

    if not comments:
        raise ValueError("The export contains no comments.")
    return comments


def discover_routes(site_root: Path) -> set[str]:
    source = site_root / "source"
    if not source.is_dir():
        raise ValueError(f"No source directory found in {site_root}.")

    routes: set[str] = set()
    posts = source / "_posts"
    if posts.is_dir():
        for post in posts.glob("*.md"):
            routes.add(normalize_path(post.stem))

    for page in source.rglob("*.md"):
        relative = page.relative_to(source)
        if relative.parts[0].startswith("_") or relative.parts[0] == "draft":
            continue
        if relative.name == "index.md":
            route = "/".join(relative.parts[:-1])
        else:
            route = "/".join(relative.with_suffix("").parts)
        routes.add(normalize_path(route))
    return routes


def load_path_map(path: Path | None) -> dict[str, str]:
    if not path:
        return {}
    with path.open(encoding="utf-8") as handle:
        raw = json.load(handle)
    if not isinstance(raw, dict) or not all(isinstance(key, str) and isinstance(value, str) for key, value in raw.items()):
        raise ValueError("--path-map must be a JSON object with string path keys and values.")
    return {normalize_path(key): normalize_path(value) for key, value in raw.items()}


def route_for(comment: dict[str, Any], routes: set[str], path_map: dict[str, str]) -> str | None:
    legacy = normalize_path(str(comment["url"]))
    current = path_map.get(legacy, legacy)
    return current if current in routes else None


def display_time(comment: dict[str, Any]) -> str:
    raw = str(comment.get("createdAt") or "")
    if not raw:
        return "未知时间"
    try:
        created_at = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return raw
    return created_at.astimezone(SHANGHAI).strftime("%Y-%m-%d %H:%M")


def markdown_text(comment: dict[str, Any]) -> str:
    converter = CommentHtmlConverter()
    body = str(comment.get("comment") or "")
    try:
        converter.feed(body)
        converter.close()
        text = converter.markdown()
    except Exception:
        text = re.sub(r"<[^>]+>", "", html.unescape(body)).strip()
    return text or "（原评论为空）"


def escape_markdown_text(value: str) -> str:
    return re.sub(r"([\\`*{}\[\]()<>_])", r"\\\1", value)


def author_label(comment: dict[str, Any]) -> str:
    name = escape_markdown_text(str(comment.get("nick") or "Anonymous"))
    link = str(comment.get("link") or "").strip()
    if link.startswith(("https://", "http://")):
        return f"[{name}]({link})"
    return name


def migration_marker(comment: dict[str, Any]) -> str:
    return f"<!-- {MARKER_PREFIX}{comment['objectId']} -->"


def discussion_body(comment: dict[str, Any]) -> str:
    return "\n\n".join(
        [
            migration_marker(comment),
            f"**{author_label(comment)}** 在 `{display_time(comment)}` 说：",
            markdown_text(comment),
        ]
    )


def build_preview(
    comments: list[dict[str, Any]], routes: set[str], path_map: dict[str, str]
) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    comments_by_route: dict[str, list[dict[str, Any]]] = defaultdict(list)
    unmatched: Counter[str] = Counter()
    ids = {str(comment["objectId"]) for comment in comments}
    reply_count = 0
    missing_parent_count = 0

    for comment in comments:
        if comment.get("pid"):
            reply_count += 1
            if str(comment["pid"]) not in ids:
                missing_parent_count += 1
        route = route_for(comment, routes, path_map)
        if route:
            comments_by_route[route].append(comment)
        else:
            unmatched[normalize_path(str(comment["url"]))] += 1

    for route_comments in comments_by_route.values():
        route_comments.sort(key=lambda comment: str(comment.get("createdAt") or ""))

    preview = {
        "mode": "preview",
        "comments": len(comments),
        "top_level_comments": len(comments) - reply_count,
        "replies": reply_count,
        "missing_reply_parents": missing_parent_count,
        "matched_paths": [
            {"pathname": route, "comments": len(route_comments)}
            for route, route_comments in sorted(comments_by_route.items())
        ],
        "unmatched_paths": [
            {"pathname": route, "comments": count}
            for route, count in sorted(unmatched.items())
        ],
        "ignored_legacy_fields": ["ACL", "ip", "mail", "ua", "QQAvatar", "img"],
        "next_step": (
            "Add every unmatched legacy path to --path-map, rerun the preview, then use --apply."
            if unmatched
            else "All paths match. Review this report, then rerun with --apply to import."
        ),
    }
    return preview, comments_by_route


def graphql(token: str, query: str, variables: dict[str, Any]) -> dict[str, Any]:
    payload = json.dumps({"query": query, "variables": variables}).encode()
    request = Request(
        GITHUB_GRAPHQL_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/vnd.github+json",
        },
    )
    try:
        with urlopen(request) as response:
            result = json.load(response)
    except HTTPError as error:
        raise RuntimeError(f"GitHub GraphQL request failed: HTTP {error.code}") from error
    if result.get("errors"):
        messages = "; ".join(error.get("message", "Unknown error") for error in result["errors"])
        raise RuntimeError(f"GitHub GraphQL error: {messages}")
    return result["data"]


DISCUSSIONS_QUERY = """
query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    discussions(first: 100, after: $after) {
      nodes {
        id
        title
        category { id }
        comments(first: 100) {
          nodes {
            id
            body
            replies(first: 100) { nodes { id body } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}
"""

CREATE_DISCUSSION_MUTATION = """
mutation($input: CreateDiscussionInput!) {
  createDiscussion(input: $input) { discussion { id title } }
}
"""

ADD_COMMENT_MUTATION = """
mutation($input: AddDiscussionCommentInput!) {
  addDiscussionComment(input: $input) { comment { id body } }
}
"""


def existing_discussions(
    token: str, repository: str, category_id: str
) -> dict[str, dict[str, Any]]:
    owner, name = repository.split("/", 1)
    after: str | None = None
    by_title: dict[str, dict[str, Any]] = {}
    while True:
        data = graphql(token, DISCUSSIONS_QUERY, {"owner": owner, "name": name, "after": after})
        connection = data["repository"]["discussions"]
        for discussion in connection["nodes"]:
            if discussion["category"]["id"] == category_id:
                by_title[discussion["title"]] = discussion
        if not connection["pageInfo"]["hasNextPage"]:
            return by_title
        after = connection["pageInfo"]["endCursor"]


def comment_id_markers(discussion: dict[str, Any]) -> dict[str, str]:
    found: dict[str, str] = {}
    for comment in discussion.get("comments", {}).get("nodes", []):
        for item in [comment, *comment.get("replies", {}).get("nodes", [])]:
            match = re.search(rf"<!--\s*{MARKER_PREFIX}([^\s>]+)\s*-->", item["body"])
            if match:
                found[match.group(1)] = item["id"]
    return found


def import_comments(
    token: str,
    repository: str,
    repository_id: str,
    category_id: str,
    comments_by_route: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    known_discussions = existing_discussions(token, repository, category_id)
    created_discussions = 0
    created_comments = 0
    skipped_comments = 0

    for route, comments in sorted(comments_by_route.items()):
        discussion = known_discussions.get(route)
        if not discussion:
            data = graphql(
                token,
                CREATE_DISCUSSION_MUTATION,
                {
                    "input": {
                        "repositoryId": repository_id,
                        "categoryId": category_id,
                        "title": route,
                        "body": f"<!-- LeanCloud comments migrated for {route} -->",
                    }
                },
            )
            discussion = {"id": data["createDiscussion"]["discussion"]["id"], "comments": {"nodes": []}}
            created_discussions += 1

        imported = comment_id_markers(discussion)
        by_legacy_id = {str(comment["objectId"]): comment for comment in comments}

        def add_comment(comment: dict[str, Any]) -> str:
            nonlocal created_comments, skipped_comments
            legacy_id = str(comment["objectId"])
            if legacy_id in imported:
                skipped_comments += 1
                return imported[legacy_id]

            reply_to = None
            parent_id = str(comment.get("pid") or "")
            if parent_id:
                parent = by_legacy_id.get(parent_id)
                if not parent:
                    raise RuntimeError(f"Missing parent {parent_id} for comment {legacy_id}.")
                reply_to = add_comment(parent)

            input_data: dict[str, str] = {
                "discussionId": discussion["id"],
                "body": discussion_body(comment),
            }
            if reply_to:
                input_data["replyToId"] = reply_to
            data = graphql(token, ADD_COMMENT_MUTATION, {"input": input_data})
            comment_id = data["addDiscussionComment"]["comment"]["id"]
            imported[legacy_id] = comment_id
            created_comments += 1
            return comment_id

        for comment in comments:
            add_comment(comment)

    return {
        "mode": "applied",
        "created_discussions": created_discussions,
        "created_comments": created_comments,
        "skipped_existing_comments": skipped_comments,
    }


def write_report(report: dict[str, Any], destination: Path | None) -> None:
    content = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if destination:
        destination.write_text(content, encoding="utf-8")
    else:
        print(content, end="")


def main() -> int:
    arguments = parse_arguments()
    try:
        comments = load_export(arguments.input)
        routes = discover_routes(arguments.site_root.resolve())
        path_map = load_path_map(arguments.path_map)
        preview, comments_by_route = build_preview(comments, routes, path_map)

        if not arguments.apply:
            write_report(preview, arguments.report)
            return 0

        required = [arguments.repository, arguments.repository_id, arguments.category_id]
        if not all(required):
            raise ValueError("--apply requires --repository, --repository-id, and --category-id.")
        if preview["unmatched_paths"] and not arguments.skip_unmatched:
            raise ValueError(
                "Refusing --apply while unmatched legacy paths remain. "
                "Use --path-map or pass --skip-unmatched."
            )
        token = os.environ.get("GITHUB_TOKEN")
        if not token:
            raise ValueError("--apply requires GITHUB_TOKEN in the environment.")
        if "/" not in arguments.repository or arguments.repository.count("/") != 1:
            raise ValueError("--repository must use OWNER/NAME form.")

        report = {**preview, **import_comments(
            token,
            arguments.repository,
            arguments.repository_id,
            arguments.category_id,
            comments_by_route,
        )}
        if arguments.skip_unmatched:
            report["skipped_unmatched_comments"] = sum(
                item["comments"] for item in preview["unmatched_paths"]
            )
        write_report(report, arguments.report)
        return 0
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
