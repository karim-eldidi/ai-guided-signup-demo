import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getUserByEmail,
  createUserOrUpdate,
  saveUserPreferences,
  saveUserFavorites,
  createSession,
  updateSession,
  createMembershipExportPayload,
  db
} from "../src/db.js";
import { matchVenues, VENUES } from "../src/venues.js";

describe("User Profile, Preferences, and Favorites Database & Parity", () => {
  test("Database User CRUD and Profile Updates", () => {
    const testEmail = "test.user." + Date.now() + "@example.com";
    const user = createUserOrUpdate({
      email: testEmail,
      firstName: "Karim",
      lastName: "Eldidi"
    });
    assert.ok(user && user.id, "User should be created with an ID");
    assert.equal(user.email, testEmail);
    assert.equal(user.first_name, "Karim");
    assert.equal(user.last_name, "Eldidi");

    const fetched = getUserByEmail(testEmail);
    assert.ok(fetched, "User should be retrievable by email");
    assert.equal(fetched.id, user.id);
    assert.equal(fetched.first_name, "Karim");

    const updated = createUserOrUpdate({
      email: testEmail,
      firstName: "Karim-Updated",
      lastName: "Eldidi-Updated"
    });
    assert.equal(updated.first_name, "Karim-Updated");
    assert.equal(updated.last_name, "Eldidi-Updated");
  });

  test("User Preferences Persistence & Retrieval", () => {
    const testEmail = "alex." + Date.now() + "@example.com";
    const user = createUserOrUpdate({
      email: testEmail,
      firstName: "Alex"
    });

    const prefs = {
      minRating: 4.5,
      strictlyNearMe: true,
      sportFocus: ["bouldering", "yoga"]
    };

    const savedPrefs = saveUserPreferences(user.id, prefs);
    assert.equal(savedPrefs.minRating, 4.5);
    assert.equal(savedPrefs.strictlyNearMe, true);
    assert.deepEqual(savedPrefs.sportFocus, ["bouldering", "yoga"]);

    const fetchedUser = getUserByEmail(testEmail);
    assert.ok(fetchedUser.preferences, "User object should include joined preferences");
    assert.equal(fetchedUser.preferences.minRating, 4.5);
    assert.equal(fetchedUser.preferences.strictlyNearMe, true);
    assert.deepEqual(fetchedUser.preferences.sportFocus, ["bouldering", "yoga"]);
  });

  test("User Favorites Persistence & Retrieval", () => {
    const testEmail = "sportsfan." + Date.now() + "@example.com";
    const user = createUserOrUpdate({
      email: testEmail,
      firstName: "Sam"
    });

    const favs = {
      "boulderklub-kreuzberg": { freq: 1 },
      "element-yoga": { freq: 2 },
      "holmes-place-potsdamer-platz": { freq: 1 }
    };

    saveUserFavorites(user.id, favs);
    const fetchedUser = getUserByEmail(testEmail);
    assert.ok(fetchedUser.favorites, "User object should include joined favorites");
    assert.equal(Object.keys(fetchedUser.favorites).length, 3);
    assert.equal(fetchedUser.favorites["element-yoga"].freq, 2);
  });

  test("Membership Export Payload Generation for Internal Systems", () => {
    const session = createSession({ source: "organic" });
    updateSession(session.id, {
      email: "future-member@example.com",
      first_name: "Jordan",
      last_name: "Smith",
      chosen_plan_id: "premium",
      commitment_id: "annual",
      start_date: "2026-09-01",
      payment_status: "simulated_card",
      answers: { goal: ["strength"], activities: ["crossfit"], area: ["mitte"], frequency: "thrice" },
      preferences: { minRating: 4.0, strictlyNearMe: false, sportFocus: ["crossfit"] },
      starred_venues: { "crossfit-mitte": { freq: 3 } }
    });

    const payload = createMembershipExportPayload(session.id);
    assert.ok(payload, "Export payload should be successfully built");
    assert.equal(payload.version, "2026-08");
    assert.equal(payload.sessionId, session.id);
    assert.equal(payload.identity.email, "future-member@example.com");
    assert.equal(payload.identity.firstName, "Jordan");
    assert.equal(payload.identity.lastName, "Smith");
    assert.equal(payload.membership.planId, "premium");
    assert.equal(payload.membership.commitmentId, "annual");
    assert.equal(payload.profile.preferences.minRating, 4.0);
    assert.deepEqual(payload.profile.preferences.sportFocus, ["crossfit"]);
    assert.ok(payload.profile.starredVenues["crossfit-mitte"]);
    assert.ok(payload.exportedAt);
  });

  test("Venue Matching Respects User Preferences", () => {
    const answers = {
      area: ["mitte"],
      activities: ["gym", "yoga"],
      frequency: "twice"
    };

    const baseMatch = matchVenues(answers);
    assert.ok(baseMatch.venues.length > 0);

    const highRatedMatch = matchVenues({ ...answers, preferences: { minRating: 4.5 } });
    for (const v of highRatedMatch.venues) {
      if (v.rating) {
        assert.ok(v.rating >= 4.5, "Venue rating should be >= 4.5");
      }
    }

    const sportFocusMatch = matchVenues({ ...answers, preferences: { sportFocus: ["bouldering"] } });
    assert.ok(sportFocusMatch.venues.length > 0);
  });
});
