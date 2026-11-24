import { describe, expect, it } from "vitest";

import {
  bpmToFormText,
  formatLength,
  formatSongMusicSummary,
  lengthToFormText,
  parseLength,
  toSubmittedBpm,
  toSubmittedLength,
} from "../../../features/choreographies/model/song-music";

describe("song length", () => {
  it("parses m:ss and rejects everything else", () => {
    expect(parseLength("3:45")).toBe(225);
    expect(parseLength(" 0:05 ")).toBe(5);
    expect(parseLength("60:00")).toBe(3600);
    expect(parseLength("12:00")).toBe(720);
    for (const text of ["", "225", "3:5", "3:60", "3:45:10", "abc", "-1:20", ":30"]) {
      expect(parseLength(text)).toBeNull();
    }
  });

  it("formats seconds as m:ss", () => {
    expect(formatLength(225)).toBe("3:45");
    expect(formatLength(5)).toBe("0:05");
    expect(formatLength(3600)).toBe("60:00");
    expect(parseLength(formatLength(187))).toBe(187);
  });
});

describe("submitted values", () => {
  it("converts whole numbers and passes other text on for the backend to reject", () => {
    expect(toSubmittedBpm(" 120 ")).toBe(120);
    expect(toSubmittedBpm("")).toBe("");
    expect(toSubmittedBpm("12.5")).toBe("12.5");
    expect(toSubmittedBpm("fast")).toBe("fast");
    expect(toSubmittedLength("3:45")).toBe(225);
    expect(toSubmittedLength("")).toBe("");
    expect(toSubmittedLength(" 225 ")).toBe("225");
  });

  it("turns loaded values into form text", () => {
    expect(bpmToFormText(120)).toBe("120");
    expect(bpmToFormText(undefined)).toBe("");
    expect(lengthToFormText(225)).toBe("3:45");
    expect(lengthToFormText(undefined)).toBe("");
  });
});

describe("formatSongMusicSummary", () => {
  it("joins the available parts", () => {
    expect(formatSongMusicSummary({ bpm: 120, genre: "Country", length_seconds: 225 })).toBe(
      "120 BPM · Country · 3:45",
    );
    expect(formatSongMusicSummary({ genre: " Pop " })).toBe("Pop");
    expect(formatSongMusicSummary({ length_seconds: 90 })).toBe("1:30");
  });

  it("is empty without music metadata", () => {
    expect(formatSongMusicSummary({})).toBe("");
    expect(formatSongMusicSummary({ genre: "  " })).toBe("");
  });
});
