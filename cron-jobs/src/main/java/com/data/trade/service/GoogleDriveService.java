package com.data.trade.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleDriveService {
    
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Collections.singletonList(DriveScopes.DRIVE_FILE);
    private static final String TOKENS_DIRECTORY_PATH = "tokens";
    
    @Value("${google.drive.credentials.path:credentials.json}")
    private String credentialsPath;
    
    @Value("${google.drive.folder.id:}")
    private String folderId;
    
    private Drive driveService;
    
    private Drive getDriveService() throws GeneralSecurityException, IOException {
        if (driveService == null) {
            final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
            driveService = new Drive.Builder(HTTP_TRANSPORT, JSON_FACTORY, getCredentials(HTTP_TRANSPORT))
                    .setApplicationName("Stock Watcher Backup")
                    .build();
        }
        return driveService;
    }
    
    private Credential getCredentials(final NetHttpTransport HTTP_TRANSPORT) throws IOException {
        InputStream in = new FileInputStream(credentialsPath);
        if (in == null) {
            throw new FileNotFoundException("Resource not found: " + credentialsPath);
        }
        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, new InputStreamReader(in));
        
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                HTTP_TRANSPORT, JSON_FACTORY, clientSecrets, SCOPES)
                .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
                .setAccessType("offline")
                .build();
        LocalServerReceiver receiver = new LocalServerReceiver.Builder().setPort(8888).build();
        return new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");
    }
    
    public String uploadFile(String fileName, byte[] fileContent, String mimeType) {
        try {
            Drive drive = getDriveService();
            File fileMetadata = new File();
            fileMetadata.setName(fileName);
            if (folderId != null && !folderId.isEmpty()) {
                fileMetadata.setParents(Collections.singletonList(folderId));
            }
            
            ByteArrayInputStream contentStream = new ByteArrayInputStream(fileContent);
            File file = drive.files().create(fileMetadata, 
                    new com.google.api.client.http.InputStreamContent(mimeType, contentStream))
                    .setFields("id")
                    .execute();
            
            log.info("File uploaded successfully to Google Drive: {} with ID: {}", fileName, file.getId());
            return file.getId();
        } catch (Exception e) {
            log.error("Failed to upload file to Google Drive: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file to Google Drive", e);
        }
    }
}


