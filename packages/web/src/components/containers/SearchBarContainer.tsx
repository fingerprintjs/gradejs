import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './SearchBarContainer.module.scss';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { useScanResult } from '../../store/hooks/scan/useScanResult';
import { trackCustomEvent } from '../../services/analytics';
import { fetchSearchData, openSearch, closeSearch, resetSearch } from '../../store/slices/search';
import { selectSearchOpen, selectSearchResults } from '../../store/selectors/search';
import { CSSTransition } from 'react-transition-group';
import PortalModal from 'components/ui/ReactPortal/ReactPortal';
import SearchBar from '../ui/SearchBar/SearchBar';
import SearchDropdown from '../ui/SearchDropdown/SearchDropdown';
import useOnClickOutside from '../../hooks/useClickOutside';
import { SearchSuggestion } from '../../mocks/SearchSuggestions';
import { Error } from '../layouts';

type Props = {
  initialValue?: string;
  size?: 'default' | 'large';
  variant?: 'regular' | 'hero';
  placeholder?: string;
};

const backdropTransitionClassNames = {
  enter: styles.overlayEnter,
  enterActive: styles.overlayEnterActive,
  enterDone: styles.overlayEnterDone,
  exit: styles.overlayExit,
  exitActive: styles.overlayExitActive,
  exitDone: styles.overlayExitDone,
};

const dropdownTransitionClassNames = {
  enter: styles.dropdownEnter,
  enterActive: styles.dropdownEnterActive,
  enterDone: styles.dropdownEnterDone,
  exit: styles.dropdownExit,
};

// TODO: Dedupe logic at Home component
export default function SearchBarContainer({
  size = 'default',
  variant = 'regular',
  placeholder,
  initialValue = '',
}: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const searchDataResults = useAppSelector(selectSearchResults);
  const searchIsOpen = useAppSelector(selectSearchOpen);

  const searchContainerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(initialValue);
  const [submittedValue, setSubmittedValue] = useState<string | undefined>(undefined);
  const [highlight, setHighlight] = useState('');
  const [error, setError] = useState('');
  const [currentFocus, setCurrentFocus] = useState(-1);

  const { displayUrl, scanResult } = useScanResult(submittedValue, { requestRescan: true });

  useEffect(() => {
    if (scanResult && displayUrl && !scanResult.isLoading) {
      navigate(`/scan/${displayUrl}`);
    }
  }, [scanResult, displayUrl]);

  const handleSearchTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (currentFocus >= searchDataResults.length) {
        setCurrentFocus(0);
      } else {
        setCurrentFocus(currentFocus + 1);
      }
    } else if (e.key === 'ArrowUp') {
      if (currentFocus <= 0) {
        setCurrentFocus(searchDataResults.length - 1);
      } else {
        setCurrentFocus(currentFocus - 1);
      }
    } else if (e.key === 'Enter') {
      if (currentFocus > -1) {
        e.preventDefault();
        dispatch(closeSearch());

        const { type, title } = searchDataResults[currentFocus];
        navigate(`/${type}/${title}`);
      }
    }
  };

  const clearHandler = () => {
    setInputValue('');
    setError('');
    dispatch(resetSearch());
  };

  const focusHandler = () => {
    if (searchDataResults.length && inputValue.length > 0) {
      dispatch(openSearch());
    }
  };

  const handleSearchClose = () => {
    dispatch(closeSearch());
  };

  const submitHandler = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      setSubmittedValue(inputValue);
      dispatch(closeSearch());
      dispatch(resetSearch());

      const trackCategory = variant === 'hero' ? 'HomePage' : 'SearchBar';
      trackCustomEvent(trackCategory, 'WebsiteSubmitted');
    },
    [inputValue]
  );

  const getSearchResults = useCallback(
    debounce((value) => {
      setLoading(true);
      setError('');
      setHighlight(value);

      dispatch(fetchSearchData(value))
        .unwrap()
        .then(() => {
          setLoading(false);
          dispatch(openSearch());
        })
        .catch((err) => {
          setLoading(false);
          dispatch(openSearch());
          setError(err.message);
        });
    }, 300),
    []
  );

  const suggestionClickHandler = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.title);
    dispatch(closeSearch());
  };

  const clickOutsideHandler = () => {
    if (searchIsOpen) {
      dispatch(closeSearch());
    }
  };

  useOnClickOutside(searchContainerRef, clickOutsideHandler);

  useEffect(() => {
    if (inputValue !== '' && inputValue !== initialValue) {
      getSearchResults(inputValue);
    }

    if (inputValue === '') {
      getSearchResults.cancel();
      dispatch(closeSearch());
      setError('');
    }
  }, [inputValue, dispatch]);

  if (displayUrl && scanResult?.error) {
    return <Error host={displayUrl} />;
  }

  return (
    <>
      <PortalModal wrapperId='modal-root'>
        <CSSTransition
          in={inputValue.length > 0 && searchIsOpen}
          timeout={600}
          classNames={backdropTransitionClassNames}
          unmountOnExit
        >
          <div className={styles.overlay} onClick={handleSearchClose} />
        </CSSTransition>
      </PortalModal>

      <form
        autoComplete='off'
        ref={searchContainerRef}
        className={styles.searchBarContainer}
        onSubmit={submitHandler}
      >
        <SearchBar
          size={size}
          variant={variant}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleSearchTextChange}
          onKeyDown={handleKeyDown}
          onFocus={focusHandler}
          onClear={clearHandler}
          loading={loading}
          suggestionsOpen={searchIsOpen}
          error={error}
        />

        <CSSTransition
          in={inputValue.length > 0 && searchIsOpen}
          timeout={600}
          classNames={dropdownTransitionClassNames}
          unmountOnExit
        >
          <SearchDropdown
            searchSuggestions={searchDataResults}
            onSuggestionClick={suggestionClickHandler}
            inputValue={highlight}
            currentFocus={currentFocus}
            error={error}
          />
        </CSSTransition>
      </form>
    </>
  );
}
