import { describe, expect, it } from "vitest";

import {
  clearSongRowErrors,
  countFilledSongs,
  createInitialSongs,
  ensureEmptySongRow,
  getDefaultSong,
  removeSongRow,
  resolveSessionSong,
  setFavoriteSong,
  splitSongs,
  toSubmittedSongs,
  updateSongRow,
} from "../../../features/choreographies/model/choreography-songs";
import {
  formatSongLabel,
  resolveSongLinks,
} from "../../../features/choreographies/model/song-search";

import type { ChoreographySong, ChoreographySongInput } from "../../../types";

const row = (overrides: Partial<ChoreographySongInput> = {}): ChoreographySongInput => ({
  id: "row",
  title: "",
  artist: "",
  youtube_url: "",
  spotify_url: "",
  note: "",
  bpm: "",
  length_seconds: "",
  genre: "",
  is_favorite: false,
  ...overrides,
});
const song = (id: number, overrides: Partial<ChoreographySong> = {}): ChoreographySong => ({
  id,
  title: `Song ${id}`,
  is_favorite: false,
  ...overrides,
});

describe("song rows of the choreography form", () => {
  it("starts with one empty row and keeps exactly one trailing empty row", () => {
    expect(createInitialSongs()).toHaveLength(1);

    const filled = [row({ id: 1, title: "A" })];
    expect(ensureEmptySongRow(filled)).toHaveLength(2);
    const withEmpty = [...filled, row({ id: 2, note: " " })];
    expect(ensureEmptySongRow(withEmpty)).toBe(withEmpty);
  });

  it("assigns ids and defaults to loaded songs and appends an empty row", () => {
    const [loaded, empty] = createInitialSongs([{ title: "A", is_favorite: true }]);
    expect(loaded.id).toBeDefined();
    expect(loaded).toMatchObject({ title: "A", artist: "", youtube_url: "", is_favorite: true });
    expect(empty.title).toBe("");
  });

  it("appends an empty row when the last row gets content, but not when another row changes", () => {
    const updated = updateSongRow([row({ id: "1" })], 0, "title", "A");
    expect(updated).toHaveLength(2);
    expect(updated[0].title).toBe("A");

    const notLast = updateSongRow(updated, 0, "artist", "B");
    expect(notLast).toHaveLength(2);
  });

  it("counts only rows with content", () => {
    expect(countFilledSongs([row({ title: "A" }), row({ note: "x" }), row()])).toBe(2);
  });

  it("removes a row and keeps the trailing empty row", () => {
    const songs = [row({ id: "1", title: "A" }), row({ id: "2", title: "B" }), row({ id: "3" })];
    const result = removeSongRow(songs, 0);
    expect(result.map((item) => item.title)).toEqual(["B", ""]);
    expect(removeSongRow([row({ id: "1", title: "A" })], 0)).toHaveLength(1);
  });

  it("keeps at most one favorite", () => {
    const songs = [row({ id: "1", is_favorite: true }), row({ id: "2" })];
    expect(setFavoriteSong(songs, 1).map((item) => item.is_favorite)).toEqual([false, true]);
  });

  it("does not send placeholder ids but keeps saved ids", () => {
    expect(toSubmittedSongs([row({ id: "uuid" }), row({ id: 5 })]).map((item) => item.id)).toEqual([
      undefined,
      5,
    ]);
  });

  it("clears only the errors of one row", () => {
    expect(
      clearSongRowErrors(
        {
          "choreography_songs.a.title": "x",
          "choreography_songs.a.youtube_url": "y",
          "choreography_songs.b.title": "z",
          name: "n",
        },
        "a",
      ),
    ).toEqual({ "choreography_songs.b.title": "z", name: "n" });
  });
});

describe("default and session songs", () => {
  const songs = [song(1), song(2, { is_favorite: true }), song(3)];

  it("uses the favorite, otherwise the first song", () => {
    expect(getDefaultSong(songs)?.id).toBe(2);
    expect(getDefaultSong([song(1), song(3)])?.id).toBe(1);
    expect(getDefaultSong([])).toBeNull();
  });

  it("separates the primary song from the alternatives", () => {
    const { primary, alternatives } = splitSongs(songs);
    expect(primary?.id).toBe(2);
    expect(alternatives.map((item) => item.id)).toEqual([1, 3]);
    expect(splitSongs([])).toEqual({ primary: null, alternatives: [] });
  });

  it("resolves the chosen song and falls back to the default", () => {
    expect(resolveSessionSong(songs, 3)?.id).toBe(3);
    expect(resolveSessionSong(songs, null)?.id).toBe(2);
    expect(resolveSessionSong(songs, 99)?.id).toBe(2);
  });
});

describe("song links", () => {
  it("builds search links from title and artist when nothing is stored", () => {
    expect(resolveSongLinks({ title: "Faded", artist: "Alan Walker" })).toEqual({
      youtubeUrl: "https://www.youtube.com/results?search_query=Alan+Walker+Faded",
      spotifyUrl: "https://open.spotify.com/search/Alan+Walker+Faded",
    });
  });

  it("needs both title and artist for the search", () => {
    expect(resolveSongLinks({ title: "Faded" })).toEqual({ youtubeUrl: null, spotifyUrl: null });
    expect(resolveSongLinks({ title: " ", artist: "Alan" })).toEqual({
      youtubeUrl: null,
      spotifyUrl: null,
    });
  });

  it("prefers stored links and falls back per platform", () => {
    expect(
      resolveSongLinks({
        title: "Faded",
        artist: "Alan Walker",
        youtube_url: " https://youtu.be/1 ",
      }),
    ).toEqual({
      youtubeUrl: "https://youtu.be/1",
      spotifyUrl: "https://open.spotify.com/search/Alan+Walker+Faded",
    });
  });

  it("uses a stored link even without an artist", () => {
    expect(resolveSongLinks({ title: "Faded", spotify_url: "https://open.spotify.com/x" })).toEqual(
      { youtubeUrl: null, spotifyUrl: "https://open.spotify.com/x" },
    );
  });

  it("labels a song with its artist when known", () => {
    expect(formatSongLabel({ title: "Faded", artist: "Alan Walker" })).toBe("Alan Walker - Faded");
    expect(formatSongLabel({ title: " Faded " })).toBe("Faded");
  });
});

describe("music metadata of song rows", () => {
  it("shows loaded values as form text and starts blank without them", () => {
    const [withMusic, withoutMusic] = createInitialSongs([
      { id: 1, title: "A", bpm: 120, length_seconds: 225, genre: "Country" },
      { id: 2, title: "B" },
    ]);
    expect(withMusic).toMatchObject({ bpm: "120", length_seconds: "3:45", genre: "Country" });
    expect(withoutMusic).toMatchObject({ bpm: "", length_seconds: "", genre: "" });
  });

  it("counts a row with only music data as content", () => {
    expect(countFilledSongs([row({ genre: "Pop" }), row({ bpm: "100" }), row()])).toBe(2);
    expect(countFilledSongs([row({ length_seconds: " " })])).toBe(0);
  });

  it("submits BPM and length as numbers and hands over text that does not parse", () => {
    expect(
      toSubmittedSongs([
        row({ id: 4, title: "A", bpm: "120", length_seconds: "3:45", genre: "Country" }),
        row({ id: "uuid", title: "B", bpm: "fast", length_seconds: "225" }),
      ]),
    ).toMatchObject([
      { id: 4, bpm: 120, length_seconds: 225, genre: "Country" },
      { bpm: "fast", length_seconds: "225" },
    ]);
  });

  it("updates the music fields like any other field", () => {
    const [updated] = updateSongRow([row({ id: "1", title: "A" })], 0, "bpm", "128");
    expect(updated.bpm).toBe("128");
  });
});
