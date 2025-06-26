import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, RotateCw } from 'lucide-react';
import { MathfieldElement } from 'mathlive';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';

const EnhancedCompetitionCard = ({ 
  comp, 
  user, 
  auth, 
  onUpdate, 
  competitionEntry, 
  setCompetitionEntry 
}) => {
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [proctoringEnabled, setProctoringEnabled] = useState(false);
  const [tabFocus, setTabFocus] = useState(true);
  const [fullScreen, setFullScreen] = useState(true);
  const [webcamStream, setWebcamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [joining, setJoining] = useState(false);
  
  useEffect(() => {
    if (comp.has_quiz) {
      const mf = new MathfieldElement();
      mf.setOptions({
        virtualKeyboardMode: 'manual',
        virtualKeyboards: 'all',
        smartMode: true,
      });
    }
  }, [comp.has_quiz]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setTabFocus(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const startQuiz = async () => {
    try {
      const response = await axios.get(`${HUB_API}/competitions/${comp.id}/quiz`, auth);
      setQuizQuestions(response.data.questions);
      setQuizStarted(true);
      
      if (comp.proctoring_enabled) {
        setProctoringEnabled(true);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          });
          setWebcamStream(stream);
          
          if (comp.screen_sharing_required) {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: false
            });
            setScreenStream(screenStream);
          }
        } catch (err) {
          console.error('Error accessing media devices:', err);
          alert('Proctoring setup failed. Please enable camera access.');
        }
      }
    } catch (err) {
      console.error('Error starting quiz:', err);
      alert('Failed to load quiz questions');
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleMathInput = (questionId, value) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = async () => {
    try {
      const response = await axios.post(
        `${HUB_API}/competitions/${comp.id}/submit-quiz`,
        { answers: userAnswers },
        auth
      );
      
      setScore(response.data.score);
      setQuizSubmitted(true);
      
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      
      onUpdate();
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('Failed to submit quiz');
    }
  };

  const submitTextEntry = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${HUB_API}/competitions/${comp.id}/submit`,
        { submission_text: competitionEntry.submission },
        auth
      );
      onUpdate();
      setCompetitionEntry({ competition_id: null, submission: '' });
      alert('Entry submitted successfully!');
    } catch (err) {
      console.error('Error submitting entry:', err);
      alert(err.response?.data?.error || 'Failed to submit entry');
    }
  };

  const renderQuestion = () => {
    if (!quizQuestions.length) return null;
    
    const question = quizQuestions[currentQuestionIndex];
    
    return (
      <div className="quiz-question">
        <div className="question-header">
          <h4>Question {currentQuestionIndex + 1} of {quizQuestions.length}</h4>
          {comp.time_limit && (
            <div className="timer">
              <CountdownCircleTimer
                isPlaying={quizStarted && !quizSubmitted}
                duration={comp.time_limit * 60}
                colors={['#004777', '#F7B801', '#A30000', '#A30000']}
                colorsTime={[comp.time_limit * 60, comp.time_limit * 30, comp.time_limit * 10, 0]}
                onComplete={submitQuiz}
              >
                {({ remainingTime }) => (
                  <div className="timer-text">
                    {Math.floor(remainingTime / 60)}:{remainingTime % 60 < 10 ? '0' : ''}{remainingTime % 60}
                  </div>
                )}
              </CountdownCircleTimer>
            </div>
          )}
        </div>
        
        <div className="question-content">
          <p dangerouslySetInnerHTML={{ __html: question.text }} />
          
          {question.type === 'multiple_choice' && (
            <div className="mcq-options">
              {question.options.map((option, idx) => (
                <div key={idx} className="mcq-option">
                  <input
                    type="radio"
                    id={`q${question.id}_opt${idx}`}
                    name={`q${question.id}`}
                    checked={userAnswers[question.id] === option}
                    onChange={() => handleAnswerSelect(question.id, option)}
                  />
                  <label htmlFor={`q${question.id}_opt${idx}`}>
                    <span dangerouslySetInnerHTML={{ __html: option }} />
                  </label>
                </div>
              ))}
            </div>
          )}
          
          {question.type === 'math_expression' && (
            <math-field
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
              onInput={(e) => handleMathInput(question.id, e.target.value)}
            >
              {userAnswers[question.id] || ''}
            </math-field>
          )}
          
          {question.type === 'short_answer' && (
            <textarea
              className="short-answer-input"
              value={userAnswers[question.id] || ''}
              onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
              placeholder="Type your answer here..."
            />
          )}
        </div>
        
        <div className="question-navigation">
          <button 
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </button>
          <button 
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === quizQuestions.length - 1}
          >
            Next
          </button>
          {currentQuestionIndex === quizQuestions.length - 1 && (
            <button onClick={submitQuiz} className="submit-btn">
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderProctoringAlerts = () => {
    if (!proctoringEnabled) return null;
    
    return (
      <div className="proctoring-alerts">
        {!tabFocus && (
          <div className="alert alert-warning">
            Warning: You switched tabs during the quiz!
          </div>
        )}
        {!fullScreen && (
          <div className="alert alert-warning">
            Warning: Please remain in full screen mode!
          </div>
        )}
        {webcamStream && (
          <video 
            autoPlay 
            muted 
            playsInline 
            ref={video => {
              if (video) video.srcObject = webcamStream;
            }}
            style={{ width: '200px', display: 'block' }}
          />
        )}
      </div>
    );
  };

  const renderProgressTracking = () => {
    if (!comp.has_quiz) return null;
    
    const totalQuestions = quizQuestions.length;
    const answeredQuestions = Object.keys(userAnswers).length;
    
    return (
      <div className="progress-tracking">
        <h4>Your Progress</h4>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
          />
        </div>
        <p>{answeredQuestions} of {totalQuestions} questions answered</p>
      </div>
    );
  };

  const renderRankings = () => {
    if (!comp.leaderboard) return null;
    
    const userSchoolRank = comp.leaderboard.findIndex(
      entry => entry.school_id === user.school_id
    ) + 1;
    
    const userIndividualRank = comp.individual_leaderboard?.findIndex(
      entry => entry.user_id === user.id
    ) + 1;
    
    return (
      <div className="rankings-section">
        <div className="school-rankings">
          <h4>School Rankings</h4>
          <ol>
            {comp.leaderboard.slice(0, 5).map((entry, index) => (
              <li key={entry.school_id} className={entry.school_id === user.school_id ? 'highlight' : ''}>
                {index + 1}. {entry.school_name} - {entry.score} pts
              </li>
            ))}
            {userSchoolRank > 5 && (
              <li className="highlight">
                {userSchoolRank}. {user.school?.name} (Your school)
              </li>
            )}
          </ol>
        </div>
        
        {comp.individual_leaderboard && (
          <div className="individual-rankings">
            <h4>Individual Rankings</h4>
            <ol>
              {comp.individual_leaderboard.slice(0, 5).map((entry, index) => (
                <li key={entry.user_id} className={entry.user_id === user.id ? 'highlight' : ''}>
                  {index + 1}. {entry.user_name} ({entry.school_name}) - {entry.score} pts
                </li>
              ))}
              {userIndividualRank > 5 && (
                <li className="highlight">
                  {userIndividualRank}. {user.first_name} {user.last_name} (You)
                </li>
              )}
            </ol>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="competition-card enhanced">
      <div className="comp-header">
        <h3>{comp.title}</h3>
        <span className={`status ${comp.status}`}>
          {comp.status === 'active' ? 'Active' : 'Completed'}
        </span>
      </div>
      
      <div className="comp-details">
        <p><strong>Subject:</strong> {comp.subject}</p>
        <p><strong>Deadline:</strong> {new Date(comp.deadline).toLocaleString()}</p>
        <p><strong>Host:</strong> {comp.host_school}</p>
        {comp.time_limit && <p><strong>Time Limit:</strong> {comp.time_limit} minutes</p>}
        {comp.has_quiz && <p><strong>Quiz:</strong> {comp.quiz_questions_count} questions</p>}
      </div>
      
      <p className="comp-description">{comp.description}</p>
      
      <div className="comp-actions">
        {comp.status === 'active' && (
          <>
            {comp.is_participant ? (
              comp.has_quiz ? (
                !quizStarted ? (
                  <button onClick={startQuiz} className="start-quiz-btn">
                    Start Quiz
                  </button>
                ) : !quizSubmitted ? (
                  <>
                    {renderQuestion()}
                    {renderProctoringAlerts()}
                    {renderProgressTracking()}
                  </>
                ) : (
                  <div className="quiz-results">
                    <h4>Quiz Completed!</h4>
                    <p>Your score: {score} out of {quizQuestions.length}</p>
                    {renderRankings()}
                  </div>
                )
              ) : (
                <div className="text-submission-form">
                  <h4>Submit Your Entry</h4>
                  <form onSubmit={submitTextEntry}>
                    <textarea
                      placeholder="Your submission"
                      value={competitionEntry.competition_id === comp.id ? competitionEntry.submission : ''}
                      onChange={(e) => setCompetitionEntry({
                        submission: e.target.value,
                        competition_id: comp.id
                      })}
                      required
                      rows={6}
                      style={{ width: '100%', minHeight: '150px', marginBottom: '10px' }}
                    />
                    <button type="submit" className="submit-btn">Submit Entry</button>
                  </form>
                </div>
              )
            ) : (
              <button 
                disabled={joining}
                onClick={() => {
                  setJoining(true);
                  axios.post(`${HUB_API}/competitions/${comp.id}/join`, {}, auth)
                    .then(() => {
                      alert('Successfully joined the competition!');
                      onUpdate();
                    })
                    .catch(err => {
                      console.error('Error joining competition:', err);
                      alert(err.response?.data?.error || 'Failed to join competition');
                    })
                    .finally(() => {
                      setJoining(false);
                    });
                }}
                className="join-btn"
              >
                {joining ? 'Joining...' : 'Join Competition'}
              </button>
            )}
          </>
        )}
      </div>
      
      {(comp.status === 'completed' || quizSubmitted) && renderRankings()}
    </div>
  );
};

export default EnhancedCompetitionCard;