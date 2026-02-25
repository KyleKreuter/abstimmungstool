package de.kyle.abstimmungstool.exception;

/**
 * Thrown when attempting to create a resource that already exists.
 */
public class DuplicateException extends RuntimeException {

    public DuplicateException(String message) {
        super(message);
    }
}
