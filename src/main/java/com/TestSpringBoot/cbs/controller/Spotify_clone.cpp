#include <bits/stdc++.h>
using namespace std;

// Forward declaration
class Songs;

class Songs {
private:
    long songId;
    string songName;
    long views;
    string songArtistName;
    string uploadDate;

public:
    // Getters
    long getSongId() const { return songId; }
    string getSongName() const { return songName; }
    long getSongViews() const { return views; }
    string getArtistName() const { return songArtistName; }
    string getUploadDate() const { return uploadDate; }

    // Setters
    void setSongId(long id) { songId = id; }
    void setSongName(const string& name) { songName = name; }
    void setSongViews(long v) { views = v; }
    void setArtistName(const string& name) { songArtistName = name; }
    void setUploadDate(const string& date) { uploadDate = date; }
};

class User {
private:
    long id;
    string userName;
    string userPhoneNumber;
    string userEmail;
    string userPassword;
    vector<Songs> userPlaylist;

public:
    // Getters
    long getId() const { return id; }
    string getUserName() const { return userName; }
    string getPhoneNumber() const { return userPhoneNumber; }
    string getEmail() const { return userEmail; }
    string getPassword() const { return userPassword; }
    vector<Songs>& getPlaylist() { return userPlaylist; }

    // Setters
    void setId(long i) { id = i; }
    void setUserName(const string& name) { userName = name; }
    void setPhoneNumber(const string& phone) { userPhoneNumber = phone; }
    void setEmail(const string& email) { userEmail = email; }
    void setPassword(const string& password) { userPassword = password; }
    void setPlaylist(const vector<Songs>& playlist) { userPlaylist = playlist; }
};

class Artist {
private:
    long artistId;
    string artistName;
    vector<Songs> artistSongs;

public:
    // Getters
    long getArtistId() const { return artistId; }
    string getArtistName() const { return artistName; }
    vector<Songs>& getArtistSongs() { return artistSongs; }

    // Setters
    void setArtistId(long id) { artistId = id; }
    void setArtistName(const string& name) { artistName = name; }
    void setArtistSongs(const vector<Songs>& songs) { artistSongs = songs; }
};

class Movie {
private:
    long movieId;
    vector<Songs> movieSongs;

public:
    // Getters
    long getMovieId() const { return movieId; }
    vector<Songs>& getMovieSongs() { return movieSongs; }

    // Setters
    void setMovieId(long id) { movieId = id; }
    void setMovieSongs(const vector<Songs>& songs) { movieSongs = songs; }
};

class Spotify {
private:
    map<string, User> userDb;
    vector<Songs> songDb;
    map<string, Artist> artistDb;
    map<string, Movie> movieDb;
    map<string, Songs> songMap;
    long failed;

public:
    Spotify() {
        failed = 0;
    }

    void checkCredential(User& user) {
        if (userDb.find(user.getPhoneNumber()) != userDb.end()) {
            cout << "User exists. Please login:\n";
            loginPage(user);
        } else {
            signUpPage(user);
        }
    }

    void loginPage(User& user) {
        string phone = user.getPhoneNumber();
        string actualPass = userDb[phone].getPassword();
        if (actualPass == user.getPassword()) {
            cout << "Login Success!!\n";
            userInterface(user);
        } else {
            failed++;
            if (failed <= 5) {
                cout << "Incorrect password. Try again:\n";
                string password;
                cin >> password;
                user.setPassword(password);
                loginPage(user);
            } else {
                cout << "Login Failed. Try again after 24 hours.\n";
            }
        }
    }

    void signUpPage(User& user) {
        string phoneNumber = user.getPhoneNumber();
        userDb[phoneNumber] = user;
        cout << "SignUp Success!\n";
    }

    void streamSong(const Songs& song) {
        cout << "[Streaming] " << song.getSongName() << " by " << song.getArtistName() << "\n\n";
    }

    void showSongs(const Songs& song) {
        cout << "Name: " << song.getSongName() << "\n";
        cout << "Artist: " << song.getArtistName() << "\n";
        cout << "Views: " << song.getSongViews() << "\n";
        cout << "Upload Date: " << song.getUploadDate() << "\n";
        streamSong(song);
    }

    void userInterface(User& user) {
        // Trending
        vector<Songs> trending = songDb;
        sort(trending.begin(), trending.end(), [&](const Songs& a, const Songs& b) {
            if (a.getSongViews() == b.getSongViews()) {
                return a.getUploadDate() < b.getUploadDate();
            }
            return a.getSongViews() > b.getSongViews(); // descending
        });

        cout << "\n--- Trending Songs ---\n";
        for (const auto& song : trending) {
            showSongs(song);
        }

        // Recommendations
        cout << "\n--- Recommended Songs ---\n";
        map<string, bool> shown;
        for (const auto& userSong : user.getPlaylist()) {
            string artist = userSong.getArtistName();
            if (shown[artist]) continue;
            shown[artist] = true;
            if (artistDb.find(artist) != artistDb.end()) {
                for (const auto& song : artistDb[artist].getArtistSongs()) {
                    showSongs(song);
                }
            }
        }

        // Searching
        cout << "\nSearch by song, movie or artist name: ";
        string name;
        cin >> name;
        searchSongs(user, name);

        // Playlist creation
        user.setPlaylist({}); // clear old playlist

        cout << "\nAdd songs to your playlist (up to 5 songs):\n";
        for (int i = 0; i < 5; ++i) {
            string songName;
            cout << "Enter song name: ";
            cin >> songName;
            if (songMap.find(songName) != songMap.end()) {
                user.getPlaylist().push_back(songMap[songName]);
                cout << "Added!\n";
            } else {
                cout << "Song not found.\n";
            }
        }
    }

    void searchSongs(User& user, const string& name) {
        cout << "\n--- Search Results ---\n";
        if (movieDb.find(name) != movieDb.end()) {
            for (const auto& song : movieDb[name].getMovieSongs()) {
                showSongs(song);
            }
        }
        if (artistDb.find(name) != artistDb.end()) {
            for (const auto& song : artistDb[name].getArtistSongs()) {
                showSongs(song);
            }
        }
        if (songMap.find(name) != songMap.end()) {
            showSongs(songMap[name]);
        }
    }

    // Dummy data for testing
    void loadDummyData() {
        Songs s1, s2;
        s1.setSongId(1);
        s1.setSongName("SongA");
        s1.setSongViews(100);
        s1.setArtistName("ArtistX");
        s1.setUploadDate("2024-01-01");

        s2.setSongId(2);
        s2.setSongName("SongB");
        s2.setSongViews(200);
        s2.setArtistName("ArtistY");
        s2.setUploadDate("2024-06-01");

        songDb.push_back(s1);
        songDb.push_back(s2);
        songMap[s1.getSongName()] = s1;
        songMap[s2.getSongName()] = s2;

        Artist a1;
        a1.setArtistId(101);
        a1.setArtistName("ArtistX");
        a1.setArtistSongs({s1});
        artistDb["ArtistX"] = a1;

        Artist a2;
        a2.setArtistId(102);
        a2.setArtistName("ArtistY");
        a2.setArtistSongs({s2});
        artistDb["ArtistY"] = a2;
    }
};

int main() {
    Spotify app;
    app.loadDummyData();

    User user;
    user.setId(1);
    user.setUserName("Ajay");
    user.setPhoneNumber("1234567890");
    user.setEmail("ajay@example.com");
    user.setPassword("pass123");

    app.checkCredential(user);

    return 0;
}
