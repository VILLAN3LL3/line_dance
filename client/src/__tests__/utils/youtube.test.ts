import { describe, expect, it } from "vitest";

import { getYouTubePlaylistPageUrl, getYouTubeVideoEmbedUrl } from "../../utils/youtube";

describe("getYouTubeVideoEmbedUrl", () => {
  it("returns embed URL from standard watch link", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(getYouTubeVideoEmbedUrl(url)).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("returns embed URL from short youtu.be link", () => {
    const url = "https://youtu.be/9bZkp7q19f0";
    expect(getYouTubeVideoEmbedUrl(url)).toBe(
      "https://www.youtube.com/embed/9bZkp7q19f0",
    );
  });

  it("extracts src when iframe markup is pasted", () => {
    const iframeSnippet =
      '<iframe width="560" height="315" src="https://www.youtube.com/watch?v=FVjZpSXavQY&amp;list=PL4BTmeccouELHvelTGULIt-33JgeBytH3" title="YouTube video player"></iframe>';
    expect(getYouTubeVideoEmbedUrl(iframeSnippet)).toBe(
      "https://www.youtube.com/embed/FVjZpSXavQY",
    );
  });

  it("returns null for non-YouTube URLs", () => {
    const url = "https://example.com/watch?v=abc";
    expect(getYouTubeVideoEmbedUrl(url)).toBeNull();
  });
});

describe("getYouTubePlaylistPageUrl", () => {
  it("returns canonical playlist page URL from watch link", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL12345ABCDE";
    expect(getYouTubePlaylistPageUrl(url)).toBe(
      "https://www.youtube.com/playlist?list=PL12345ABCDE",
    );
  });

  it("returns canonical playlist page URL from playlist link", () => {
    const url = "https://www.youtube.com/playlist?list=PL4BTmeccouELHvelTGULIt-33JgeBytH3";
    expect(getYouTubePlaylistPageUrl(url)).toBe(
      "https://www.youtube.com/playlist?list=PL4BTmeccouELHvelTGULIt-33JgeBytH3",
    );
  });

  it("extracts list id from iframe snippet with escaped params", () => {
    const iframeSnippet =
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/videoseries?si=kP_Uha3UALkZBHo6&amp;list=PL4BTmeccouELHvelTGULIt-33JgeBytH3" title="YouTube video player"></iframe>';
    expect(getYouTubePlaylistPageUrl(iframeSnippet)).toBe(
      "https://www.youtube.com/playlist?list=PL4BTmeccouELHvelTGULIt-33JgeBytH3",
    );
  });

  it("returns null when URL does not contain a playlist id", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(getYouTubePlaylistPageUrl(url)).toBeNull();
  });
});
